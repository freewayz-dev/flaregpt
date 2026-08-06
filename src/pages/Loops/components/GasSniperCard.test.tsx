import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse, type PathParams } from "msw";
import { Routes, Route, Outlet } from "react-router";
import { decodeFunctionData, encodeFunctionResult } from "viem";

import GasSniperCard from "@/pages/Loops/components/GasSniperCard";
import { useAuthStore } from "@/store/useAuthStore";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";
import {
  CLAIM_SETUP_MANAGER_ABI,
  CLAIM_SETUP_MANAGER_ADDRESS,
} from "@/config/claimSetupManager";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE, TEST_ADDRESSES } from "@/test/fixtures";

interface RenderCardOptions {
  wagmi?: { connected?: boolean; address?: string; features?: Record<string, unknown> };
  openWalletModal?: () => void;
}

interface JsonRpcRequestBody {
  method: string;
  params: { data?: `0x${string}`; [key: string]: unknown }[];
  id: number;
}

const COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc";
const APPROVE_TX_HASH = `0x${"ab".repeat(32)}`;

// GasSniperCard reads useOutletContext() for openWalletModal — it's only
// ever rendered under DashboardLayout's real <Outlet context={...}> in the
// app, so it needs an equivalent stand-in here rather than crashing on
// undefined destructuring. A sibling Disconnect button (driving a real
// wagmi disconnect via the app's own useDisconnectAllWallets, not just
// poking store fields directly) lets the disconnect/reconnect test exercise
// the real thing instead of a hand-simulated approximation of it.
function DisconnectProbe() {
  const disconnectAll = useDisconnectAllWallets();
  return <button onClick={() => disconnectAll()}>Disconnect</button>;
}

function renderCard({ wagmi, openWalletModal = vi.fn() }: RenderCardOptions = {}) {
  const result = renderWithProviders(
    <Routes>
      <Route
        element={
          <Outlet context={{ openWalletModal }} />
        }
      >
        <Route
          index
          element={
            <>
              <GasSniperCard />
              <DisconnectProbe />
            </>
          }
        />
      </Route>
    </Routes>,
    { wagmi },
  );
  return { ...result, openWalletModal };
}

// One MSW handler for Coston2's RPC endpoint, branching by JSON-RPC method
// — the same approach Phase 2 established for eth_sign, extended to cover
// the read (isClaimExecutor/getExecutorCurrentFeeValue) and write
// (eth_sendTransaction + eth_getTransactionReceipt) paths handleApprove
// actually drives. Decoding/encoding via viem's own ABI helpers rather
// than hand-built hex, so this can't silently drift from the real ABI.
function mockCoston2Rpc({
  isApproved,
  rejectSendTransaction = false,
}: {
  isApproved: boolean;
  rejectSendTransaction?: boolean;
}) {
  server.use(
    http.post<PathParams, JsonRpcRequestBody>(COSTON2_RPC, async ({ request }) => {
      const { method, params, id } = await request.json();
      const ok = (result: unknown) => HttpResponse.json({ jsonrpc: "2.0", id, result });

      // The real crash this protects: MetaMask reports a user-rejected
      // transaction as a normal JSON-RPC error response, not a network
      // failure — see setClaimExecutors below.
      if (method === "eth_sendTransaction" && rejectSendTransaction) {
        return HttpResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: 4001, message: "User rejected the request." },
        });
      }

      if (method === "eth_call") {
        const { functionName } = decodeFunctionData({
          abi: CLAIM_SETUP_MANAGER_ABI,
          data: params[0].data!,
        });
        if (functionName === "isClaimExecutor") {
          return ok(
            encodeFunctionResult({
              abi: CLAIM_SETUP_MANAGER_ABI,
              functionName: "isClaimExecutor",
              result: isApproved,
            }),
          );
        }
        if (functionName === "getExecutorCurrentFeeValue") {
          return ok(
            encodeFunctionResult({
              abi: CLAIM_SETUP_MANAGER_ABI,
              functionName: "getExecutorCurrentFeeValue",
              result: 0n,
            }),
          );
        }
      }

      if (method === "eth_sendTransaction") return ok(APPROVE_TX_HASH);

      // Mined on the first poll — this suite is only proving the UI wires
      // up to a confirmed receipt correctly, not exercising real pending-
      // block timing.
      if (method === "eth_getTransactionReceipt") {
        return ok({
          transactionHash: APPROVE_TX_HASH,
          status: "0x1",
          blockNumber: "0x1",
          blockHash: `0x${"11".repeat(32)}`,
          logs: [],
          gasUsed: "0x5208",
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x1",
          transactionIndex: "0x0",
          contractAddress: null,
          from: TEST_ADDRESSES.primary.toLowerCase(),
          to: CLAIM_SETUP_MANAGER_ADDRESS.toLowerCase(),
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

// A real (if minimal) backend, not two independently-typed static
// responses — enable/disable actually mutate what the next status check
// reports, exactly like the live endpoints described in loopsService.js.
// Without this, a mocked "enable" that never changes what "status" reports
// next would let a real wiring bug (enable succeeding but the UI never
// finding out) pass silently.
function mockGasSniperBackend({ initiallyOptedIn = [] as string[] } = {}) {
  let optedInWallets = [...initiallyOptedIn];
  server.use(
    http.get(`${API_BASE}/api/v1/loops/gas-sniper/status`, () =>
      HttpResponse.json({
        opted_in_count: optedInWallets.length,
        opted_in_wallets: optedInWallets,
        recent_dry_run_events: [],
      }),
    ),
    http.post<PathParams, { user_wallet: string }>(
      `${API_BASE}/api/v1/loops/gas-sniper/enable`,
      async ({ request }) => {
        const { user_wallet } = await request.json();
        if (!optedInWallets.includes(user_wallet)) optedInWallets = [...optedInWallets, user_wallet];
        return HttpResponse.json({ status: "enabled" });
      },
    ),
    http.post<PathParams, { user_wallet: string }>(
      `${API_BASE}/api/v1/loops/gas-sniper/disable`,
      async ({ request }) => {
        const { user_wallet } = await request.json();
        optedInWallets = optedInWallets.filter((w) => w !== user_wallet);
        return HttpResponse.json({ status: "disabled" });
      },
    ),
  );
}

describe("GasSniperCard — disconnected", () => {
  it("shows Connect Wallet, no toggle", async () => {
    renderCard();
    expect(await screen.findByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("GasSniperCard — connected + signed in, not yet approved", () => {
  it("shows an OFF toggle, not the Approve button — the exact regression this protects", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("only reveals the Approve button after the user turns the toggle on", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });

    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    expect(
      await screen.findByRole("button", { name: "Approve on Coston2" }),
    ).toBeInTheDocument();
    // The toggle itself is replaced by the approval panel, not left
    // visible-but-stuck-off alongside it.
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("Needs approval")).toBeInTheDocument();
  });
});

describe("GasSniperCard — already-approved wallets", () => {
  it("turning the toggle on goes straight to Active — no approval panel ever shown", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);

    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("GasSniperCard — page refresh with persisted (already-enabled) state", () => {
  it("renders the toggle already ON, with no approval panel, on first render", async () => {
    mockGasSniperBackend({ initiallyOptedIn: [TEST_ADDRESSES.primary] });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("GasSniperCard — switching wallets", () => {
  it("a fresh wallet never inherits the previous wallet's approval-requested state", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const firstToggle = await screen.findByRole("switch");
    fireEvent.click(firstToggle);
    await screen.findByRole("button", { name: "Approve on Coston2" });

    // Switching wallets — a different address becomes authenticated,
    // exactly like GasSniperCard's own reset effect keys on.
    useAuthStore.setState({ authenticatedAddress: TEST_ADDRESSES.watchlist });

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });
});

describe("GasSniperCard — disconnect / reconnect", () => {
  it("mid-approval, disconnecting shows a reconnect prompt instead of a dead Approve button", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);
    await screen.findByRole("button", { name: "Approve on Coston2" });

    // A real wagmi disconnect — session persists through it (see
    // useAuthStore.js), only the live connection drops.
    fireEvent.click(screen.getByText("Disconnect"));

    expect(await screen.findByText("Reconnect to continue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve on Coston2" })).not.toBeInTheDocument();
  });
});

describe("GasSniperCard — approval succeeds", () => {
  it("auto-enables and reaches Active without a second manual toggle click", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    const approveButton = await screen.findByRole("button", { name: "Approve on Coston2" });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("GasSniperCard — approval rejected in the wallet", () => {
  // The real bug this protects: clicking Approve, then rejecting the
  // transaction in the wallet, crashed the entire app with an uncaught
  // "Element type is invalid" error — root-caused to a react-toastify +
  // React 19 incompatibility (fixed by upgrading react-toastify to v11).
  // The error toast this test asserts on is exactly what silently never
  // rendered before: nothing in this suite ever mounted a real
  // ToastContainer, so the crash had no way to surface here until
  // test-utils.jsx's renderWithProviders started including one.
  it("shows an error toast and leaves the app intact — no crash, no blank page", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false, rejectSendTransaction: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    const approveButton = await screen.findByRole("button", { name: "Approve on Coston2" });
    fireEvent.click(approveButton);

    expect(
      await screen.findByText("Couldn't complete the approval. Try again."),
    ).toBeInTheDocument();
    // The app is still alive and usable — the Approve button is back,
    // re-enabled, ready for a retry, not a blank page.
    expect(screen.getByRole("button", { name: "Approve on Coston2" })).toBeEnabled();
  });
});
