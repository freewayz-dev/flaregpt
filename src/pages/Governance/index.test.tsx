import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse, type PathParams } from "msw";
import { Routes, Route, Outlet } from "react-router";
import { decodeFunctionData, encodeFunctionResult, type Address } from "viem";

import Governance from "@/pages/Governance";
import { useWalletHubStore } from "@/store/useWalletHubStore";
import { POLLING_FOUNDATION_ABI, CURRENT_POLLING } from "@/config/governance";
import { renderWithProviders, screen, fireEvent, waitFor, within } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { TEST_ADDRESSES } from "@/test/fixtures";

const POLLING_FOUNDATION_ADDRESS = CURRENT_POLLING.flare.address;

const FLARE_RPC = "https://flare-api.flare.network/ext/C/rpc";

interface JsonRpcRequestBody {
  method: string;
  params: { to?: string; data?: `0x${string}`; [key: string]: unknown }[];
  id: number;
}

// The real FIP-16 proposal, exactly as observed live on Flare mainnet
// (see deriveGovernance.test.ts and config/governance.ts's own comments)
// — reused here so the mock RPC responds with genuine field values, not
// arbitrary test fixtures.
const FIP_16_ID = 51_914_424_702_816_958_886_013_892_960_058_526_100_547_147_635_160_786_098_641_945_967_853_823_562_127n;
const FIP_16_INFO = [
  "0xb5Dd6cA7b14bd7d2B6E296983D0AA0D373979CFE" as Address,
  true,
  58_862_737n,
  1_776_772_800n,
  1_777_377_600n,
  0n,
  0n,
  0n,
  5000n,
  85_758_879_547_684_145_234_062_811_737n,
  "FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability",
] as const;
const FIP_16_VOTES = [5_584_276_388_171_569_457_423_523_902n, 110_535_155_356_761_807_469_936_046n] as const;
const FIP_16_STATE = 4; // Queued — the real, live terminal state for this proposal.

interface MockGovernanceRpcOptions {
  proposalIds?: readonly bigint[];
  hasVoted?: boolean;
  votingPower?: bigint;
  proposalIdsError?: boolean;
}

function mockGovernanceRpc({
  proposalIds = [FIP_16_ID],
  hasVoted = false,
  votingPower = 0n,
  proposalIdsError = false,
}: MockGovernanceRpcOptions = {}) {
  server.use(
    http.post<PathParams, JsonRpcRequestBody>(FLARE_RPC, async ({ request }) => {
      const { method, params, id } = await request.json();
      const ok = (result: unknown) => HttpResponse.json({ jsonrpc: "2.0", id, result });

      if (method === "eth_blockNumber") return ok("0x1");
      if (method === "eth_chainId") return ok("0xe");
      // Historical (deprecated-contract) proposal descriptions come from
      // eth_getLogs, not eth_call — these tests only exercise the current
      // contract, so an empty result is the correct "nothing historical
      // resolved" response, not a failure.
      if (method === "eth_getLogs") return ok([]);

      if (method === "eth_call") {
        // Every historical FIP-07..10 ref (see config/governance.ts) also
        // gets read on every render via useHistoricalProposals — these
        // tests are only about the current contract's data, so a clean
        // per-call revert (wagmi's normal allowFailure semantics — this
        // does NOT fail the overall query) is the right response, not a
        // decode attempt against POLLING_FOUNDATION_ABI, which doesn't
        // match the historical contract's 10-field shape anyway.
        if (params[0].to?.toLowerCase() !== POLLING_FOUNDATION_ADDRESS.toLowerCase()) {
          return HttpResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: "execution reverted" },
          });
        }
        const { functionName, args } = decodeFunctionData({
          abi: POLLING_FOUNDATION_ABI,
          data: params[0].data!,
        });

        if (functionName === "getProposalIds") {
          if (proposalIdsError) {
            return HttpResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32000, message: "execution reverted" },
            });
          }
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: proposalIds }));
        }
        if (functionName === "getProposalInfo") {
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: FIP_16_INFO }));
        }
        if (functionName === "getProposalVotes") {
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: FIP_16_VOTES }));
        }
        if (functionName === "state") {
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: FIP_16_STATE }));
        }
        if (functionName === "hasVoted") {
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: hasVoted }));
        }
        if (functionName === "getVotes") {
          return ok(encodeFunctionResult({ abi: POLLING_FOUNDATION_ABI, functionName, result: votingPower }));
        }
        return HttpResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unhandled function: ${functionName}, args: ${args}` },
        });
      }

      return HttpResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unhandled mock RPC method: ${method}` },
      });
    }),
  );
}

function renderGovernance(wagmi?: { connected?: boolean; address?: string }) {
  const openWalletModal = vi.fn();
  const result = renderWithProviders(
    <Routes>
      <Route element={<Outlet context={{ openWalletModal }} />}>
        <Route index element={<Governance />} />
      </Route>
    </Routes>,
    { wagmi },
  );
  return { ...result, openWalletModal };
}

describe("Governance — public data, no wallet", () => {
  it("shows real proposal history and stats regardless of wallet presence — public governance data needs no wallet", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID] });

    renderGovernance();

    // Two matches, not one — Governance History renders both a mobile
    // card list and a desktop table for the same data (see
    // GovernanceHistoryTable.tsx); jsdom doesn't evaluate the
    // `sm:hidden`/`hidden sm:block` breakpoint classes that keep only one
    // visible in a real browser, so both are present in the test DOM.
    expect(
      await screen.findAllByText("FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability"),
    ).toHaveLength(2);
    // Address confirmed live has 6 real proposals with none currently
    // active (POLLING_FOUNDATION_ADDRESS matches the contract this whole
    // page is built on) — this test uses just the one for a focused
    // assertion, but pins the real contract address is what's targeted.
    expect(POLLING_FOUNDATION_ADDRESS).toBe("0xc8294a2335C6c45de827121090ce4Ba9977907D2");
  });

  it("shows a quiet connect-wallet prompt for Your Governance instead of any personalized numbers", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID] });

    renderGovernance();

    expect(await screen.findByText("See your governance activity")).toBeInTheDocument();
    expect(screen.queryByText("Your Voting Power")).not.toBeInTheDocument();
  });

  it("opens the wallet modal from the Your Governance prompt", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID] });

    const { openWalletModal } = renderGovernance();
    await screen.findByText("See your governance activity");

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));
    expect(openWalletModal).toHaveBeenCalledTimes(1);
  });

  it("shows the empty active-proposals state — the real, current live state (no active FIPs right now)", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID] });

    renderGovernance();

    expect(await screen.findByText("No active proposals")).toBeInTheDocument();
  });

  // Regression guard: Governance History must render every proposal
  // `getProposalIds()` returns, never an arbitrary cap — this pins that by
  // mocking more ids than the real chain currently has (6) and asserting
  // every one of them actually renders a row.
  it("renders every proposal getProposalIds() returns, not a hardcoded cap", async () => {
    const manyIds = Array.from({ length: 9 }, (_, i) => FIP_16_ID + BigInt(i));
    mockGovernanceRpc({ proposalIds: manyIds });

    renderGovernance();

    // Scoped to the desktop table specifically (jsdom renders both the
    // mobile card list and the desktop table regardless of viewport, since
    // it doesn't evaluate the `sm:` breakpoint classes that keep only one
    // visible in a real browser) — the table is the one guaranteed-unique
    // container to count rows in without double-counting both views.
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByText(
      "FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability",
    );
    expect(rows).toHaveLength(9);
  });

  it("shows an error, not a false empty state, when proposals fail to decode despite ids resolving", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID] });
    // Force getProposalInfo itself to fail while getProposalIds succeeds —
    // simulates a partial RPC failure that would otherwise silently
    // under-report real history as "no history yet".
    server.use(
      http.post<PathParams, JsonRpcRequestBody>(FLARE_RPC, async ({ request }) => {
        const { method, params, id } = await request.json();
        const ok = (result: unknown) => HttpResponse.json({ jsonrpc: "2.0", id, result });
        if (method === "eth_getLogs") return ok([]);
        if (method === "eth_call") {
          if (params[0].to?.toLowerCase() !== POLLING_FOUNDATION_ADDRESS.toLowerCase()) {
            return HttpResponse.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "execution reverted" } });
          }
          const { functionName } = decodeFunctionData({ abi: POLLING_FOUNDATION_ABI, data: params[0].data! });
          if (functionName === "getProposalIds") {
            return HttpResponse.json({
              jsonrpc: "2.0",
              id,
              result: encodeFunctionResult({
                abi: POLLING_FOUNDATION_ABI,
                functionName: "getProposalIds",
                result: [FIP_16_ID],
              }),
            });
          }
          return HttpResponse.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "execution reverted" } });
        }
        return HttpResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "unhandled" } });
      }),
    );

    renderGovernance();

    expect(await screen.findByText("Couldn't load active proposals")).toBeInTheDocument();
    expect(screen.queryByText("No governance history yet")).not.toBeInTheDocument();
  });
});

describe("Governance — watchlist wallet (not connected)", () => {
  it("shows this wallet's real voting power and participation without requiring a live connection", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID], hasVoted: true, votingPower: 37_796_426_679_952_566_481_887n });
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
      activeAddress: TEST_ADDRESSES.watchlist,
    });

    renderGovernance();

    expect(await screen.findByText("Your Voting Power")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("37.8K FLR")).toBeInTheDocument());
    // 1 of 1 concluded proposals voted on, from the real hasVoted() read.
    expect(await screen.findByText("1/1")).toBeInTheDocument();
  });

  it("shows this wallet's vote in the history table without connecting", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID], hasVoted: true });
    useWalletHubStore.setState({
      trackedWallets: [{ address: TEST_ADDRESSES.watchlist, label: "My Watchlist Wallet" }],
      activeAddress: TEST_ADDRESSES.watchlist,
    });

    renderGovernance();

    expect(await screen.findByText("Governance History")).toBeInTheDocument();
    // Both the mobile card list and the desktop table render the same
    // per-proposal "Voted" chip in jsdom (see the no-cap test's own
    // comment on why) — scoped to the table for a single, unambiguous match.
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Voted")).toBeInTheDocument();
  });
});

describe("Governance — connected wallet", () => {
  it("shows the same personalized data path as a watchlist wallet", async () => {
    mockGovernanceRpc({ proposalIds: [FIP_16_ID], hasVoted: false, votingPower: 0n });

    renderGovernance({ connected: true, address: TEST_ADDRESSES.primary });

    expect(await screen.findByText("Your Voting Power")).toBeInTheDocument();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Not voted")).toBeInTheDocument();
  });
});

describe("Governance — error state", () => {
  it("shows an error block with retry when the on-chain read fails, not a blank page", async () => {
    mockGovernanceRpc({ proposalIdsError: true });

    renderGovernance();

    expect(await screen.findByText("Couldn't load active proposals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
