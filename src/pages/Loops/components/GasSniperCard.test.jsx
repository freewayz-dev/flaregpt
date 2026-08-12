import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse} from "msw";
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

function renderCard({ wagmi, openWalletModal = vi.fn() } = {}) {
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
  onRequest,
}) {
  server.use(
    http.post(COSTON2_RPC, async ({ request }) => {
      const { method, params, id } = await request.json();
      onRequest?.(method);
      const ok = (result) => HttpResponse.json({ jsonrpc: "2.0", id, result });

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
          data: params[0].data,
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
function mockGasSniperBackend({
  initiallyOptedIn = [],
  // Lets a test make the status refetch that follows a successful enable/
  // disable measurably slower than the enable/disable request itself —
  // needed to make the actual regression here observable at all. Both
  // requests are otherwise in-process/instant under MSW, so the buggy,
  // un-awaited invalidateQueries() and the fixed, awaited one settle within
  // the same handful of milliseconds either way — findByText/waitFor's own
  // internal retrying then masks the difference regardless of which one
  // the code actually does, since both eventually reach the same visible
  // end state well inside any reasonable assertion timeout. A real,
  // measurable delay on just this one endpoint is what turns "resolved
  // before vs. after the refetch" into something a test can actually tell
  // apart.
  statusDelayMs = 0,
} = {}) {
  let optedInWallets = [...initiallyOptedIn];
  server.use(
    http.get(`${API_BASE}/api/v1/loops/gas-sniper/status`, async () => {
      if (statusDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, statusDelayMs));
      return HttpResponse.json({
        opted_in_count: optedInWallets.length,
        opted_in_wallets: optedInWallets,
        recent_dry_run_events: [],
      });
    }),
    http.post(
      `${API_BASE}/api/v1/loops/gas-sniper/enable`,
      async ({ request }) => {
        const { user_wallet } = await request.json();
        if (!optedInWallets.includes(user_wallet)) optedInWallets = [...optedInWallets, user_wallet];
        return HttpResponse.json({ status: "enabled" });
      },
    ),
    http.post(
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

describe("GasSniperCard — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
    // Restoring the property alone isn't enough to undo `fireEvent(window,
    // new Event("offline"))` below: TanStack Query's own `onlineManager` is
    // a module-level singleton (not scoped to any one QueryClient) that
    // listens for real `online`/`offline` window events, independently of
    // this app's own useOnlineStatus() hook. It only reacts to *events*,
    // never re-reads `navigator.onLine` on its own — so without firing a
    // matching "online" event here, every query in every *later* test in
    // this file (any file, if they share a worker) stays paused under
    // `networkMode: 'online'`'s default "don't fetch while offline"
    // behavior, since the test QueryClient (see test-utils.tsx) — unlike
    // the app's real one in main.tsx — never opts into `networkMode:
    // 'offlineFirst'` to route around it. A paused, never-yet-fetched
    // useReadContract (isClaimExecutor) settles as `isLoading: false,
    // data: undefined`, i.e. "not approved" — confirmed live by the exact
    // failure this caused: GasSniperCard.tsx's own needsApproval check
    // reads that as true, so a later test's toggle click was silently
    // treated as "needs approval" and never sent the enable/disable
    // request it was actually testing.
    fireEvent(window, new Event("online"));
  });

  it("disables the toggle for an already-approved wallet while offline", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });

    // Toggle.tsx is a styled <button>, not a real <input type="checkbox">
    // — it signals disabled state via aria-disabled, not the native
    // `disabled` attribute (see its own comment on why), so that's what
    // this asserts against rather than jest-dom's toBeDisabled().
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-disabled", "true");
  });

  it("disables the Approve button while offline", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);
    await screen.findByRole("button", { name: "Approve on Coston2" });

    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    fireEvent(window, new Event("offline"));

    expect(screen.getByRole("button", { name: "Approve on Coston2" })).toBeDisabled();
  });
});

// Regression coverage for the actual reported bug: useEnableGasSniper/
// useDisableGasSniper's onSuccess fired queryClient.invalidateQueries()
// without returning it, so mutateAsync() in handleToggle — and therefore
// the success toast right after it — resolved as soon as the enable/
// disable POST itself succeeded, before the status query's own background
// refetch had actually landed. The toggle (checked={isEnabled}, derived
// from that query) stayed showing the pre-click value until that refetch
// happened to catch up on its own, which read as "needs a second click."
//
// A first version of these two tests skipped straight to
// `findByText("Gas Sniper enabled")` with no artificial delay anywhere,
// on the theory that skipping `waitFor` around the toggle's own state was
// enough to catch the race. It wasn't: `findByText` is itself built on
// `waitFor` and retries for up to a second by default, and every mock
// response here is in-process/instant, so the buggy, un-awaited refetch
// and the fixed, awaited one both land within a few milliseconds either
// way — well inside that retry window regardless of which one the code
// actually does. Genuinely reverting the `return` in useLoopsQueries.ts
// left both tests passing, which is exactly how a non-discriminating test
// hides a real bug. `statusDelayMs` closes that gap: it makes the status
// refetch that follows a successful enable/disable measurably slower than
// the enable/disable request itself, so "toast appeared while the refetch
// was still in flight" becomes something a fixed 150ms mid-flight check
// can actually observe instead of something a retry loop always ends up
// tolerating.
describe("GasSniperCard — single-click toggle completes without a second click", () => {
  it("OFF → ON: the success toast never appears before the refreshed status does", async () => {
    mockGasSniperBackend({ statusDelayMs: 300 });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);

    // Mid-flight: the enable POST itself is instant, but the status
    // refetch it triggers is still 150ms into its own deliberate 300ms
    // delay. Neither the toast nor the toggle should have moved yet — if
    // they have, the toast fired off the POST alone, without actually
    // waiting for the refreshed status the toggle itself reads from.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText("Gas Sniper enabled")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");

    await screen.findByText("Gas Sniper enabled", {}, { timeout: 2000 });
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("ON → OFF: the success toast never appears before the refreshed status does", async () => {
    mockGasSniperBackend({ initiallyOptedIn: [TEST_ADDRESSES.primary], statusDelayMs: 300 });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText("Gas Sniper disabled")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");

    await screen.findByText("Gas Sniper disabled", {}, { timeout: 2000 });
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });
});

describe("GasSniperCard — failed toggle requests", () => {
  it("a failed enable: no success toast, toggle stays OFF, and is usable again", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.post(`${API_BASE}/api/v1/loops/gas-sniper/enable`, () =>
        HttpResponse.json({ detail: "Internal error" }, { status: 500 }),
      ),
    );

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    expect(await screen.findByText("Couldn't update Gas Sniper. Try again.")).toBeInTheDocument();
    expect(screen.queryByText("Gas Sniper enabled")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch")).not.toHaveAttribute("aria-disabled", "true");
  });

  it("a failed disable: no success toast, toggle stays ON, and is usable again", async () => {
    mockGasSniperBackend({ initiallyOptedIn: [TEST_ADDRESSES.primary] });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.post(`${API_BASE}/api/v1/loops/gas-sniper/disable`, () =>
        HttpResponse.json({ detail: "Internal error" }, { status: 500 }),
      ),
    );

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);

    expect(await screen.findByText("Couldn't update Gas Sniper. Try again.")).toBeInTheDocument();
    expect(screen.queryByText("Gas Sniper disabled")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).not.toHaveAttribute("aria-disabled", "true");
  });
});

describe("GasSniperCard — duplicate clicks while a request is pending", () => {
  it("sends exactly one enable request even if the toggle is clicked again before the first resolves", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    const enableSpy = vi.fn();
    let resolveEnable;
    server.use(
      http.post(`${API_BASE}/api/v1/loops/gas-sniper/enable`, async () => {
        enableSpy();
        await new Promise((resolve) => {
          resolveEnable = resolve;
        });
        return HttpResponse.json({ status: "enabled" });
      }),
    );

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    // Toggle.tsx's own handleClick returns early once `disabled` — this is
    // what's actually supposed to stop a second click, not an assumption
    // that the user simply won't try.
    await waitFor(() => expect(toggle).toHaveAttribute("aria-disabled", "true"));
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(enableSpy).toHaveBeenCalledTimes(1);

    resolveEnable?.();
    await waitFor(() => expect(toggle).not.toHaveAttribute("aria-disabled", "true"));
  });
});

describe("GasSniperCard — enabled, then wallet disconnects while still authenticated", () => {
  it("keeps showing Active — a plain disconnect must not silently disable it", async () => {
    mockGasSniperBackend({ initiallyOptedIn: [TEST_ADDRESSES.primary] });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Active")).toBeInTheDocument();

    // A real wagmi disconnect — session persists through it (see
    // useAuthStore.ts's "connection and auth are deliberately separate"
    // design), so the toggle's own source of truth (the backend's status,
    // gated on hasSession, not isConnected) is untouched by this.
    fireEvent.click(screen.getByText("Disconnect"));
    await waitFor(() => expect(screen.queryByText("Wallet disconnected")).not.toBeInTheDocument());

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("GasSniperCard — session expires mid-toggle", () => {
  it("clears cleanly: no misleading active state, no duplicate toast on top of the session-expired one", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(
      http.post(`${API_BASE}/api/v1/loops/gas-sniper/enable`, () =>
        HttpResponse.json({ detail: "Unauthorized" }, { status: 401 }),
      ),
    );

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    // apiClient.ts's own response interceptor is what actually surfaces
    // this (any 401 with a token present clears the session) — this only
    // needs to prove GasSniperCard doesn't pile its own Gas-Sniper-specific
    // toast on top of that, and that losing the session takes the toggle
    // down with it instead of leaving a stale "on" reading behind.
    expect(
      await screen.findByText("Your session expired. Please sign in again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Couldn't update Gas Sniper. Try again.")).not.toBeInTheDocument();
    expect(screen.queryByText("Gas Sniper enabled")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("switch")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });
});

describe("GasSniperCard — already-approved wallet, normal toggling", () => {
  it("never sends an on-chain transaction — the one-time approval is not repeated on every toggle", async () => {
    mockGasSniperBackend();
    const rpcMethods = [];
    mockCoston2Rpc({ isApproved: true, onRequest: (method) => rpcMethods.push(method) });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    await screen.findByRole("switch");
    // Clears the initial isClaimExecutor/getExecutorCurrentFeeValue reads
    // this card issues on mount — this test only cares what happens from
    // here, once toggling actually starts.
    rpcMethods.length = 0;

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    await screen.findByText("Gas Sniper enabled");

    fireEvent.click(toggle);
    await screen.findByText("Gas Sniper disabled");

    expect(rpcMethods).not.toContain("eth_sendTransaction");
  });
});
