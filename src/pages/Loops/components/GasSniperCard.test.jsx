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

describe("GasSniperCard — mobile wallet-confirmation fix", () => {
  // The real bug: on mobile, clicking Approve never showed anything in the
  // wallet app at all — no prompt, no rejection, just silence, and the
  // action eventually failed. Root cause, confirmed by reading the
  // installed WalletConnect SDK directly: every wallet request is deep-
  // linked to the wallet app only if `document.hasFocus()` is true at that
  // exact moment (@walletconnect/utils's handleDeeplinkRedirect); it
  // silently skips the deep link otherwise. `window.focus()` right before
  // each wallet round trip is the fix — guarded on `!document.hasFocus()`
  // (see reassertWindowFocus's own comment for why an earlier,
  // unconditional version of this regressed the plain toggle). Both tests
  // below explicitly control `document.hasFocus()` rather than relying on
  // jsdom's own default for it, so this suite doesn't silently start
  // testing something else the day that default changes.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls window.focus() before both the chain switch and the contract write when the tab isn't focused", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    const approveButton = await screen.findByRole("button", { name: "Approve on Coston2" });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(focusSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("never calls window.focus() when the tab already has focus — the exact regression this protects", async () => {
    mockGasSniperBackend();
    mockCoston2Rpc({ isApproved: false });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    fireEvent.click(toggle);

    const approveButton = await screen.findByRole("button", { name: "Approve on Coston2" });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(focusSpy).not.toHaveBeenCalled();
  });
});

// switchToConston2ViaRawRequest itself (the actual reported-bug fix — see
// its own comment in src/utils/walletConnectChainSwitch.js for the full
// trace) has its own direct unit coverage there, colocated with the
// function rather than with this component.

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

    // Substring match, not exact — the toast currently also appends a
    // temporary `[step: detail]` diagnostic suffix (see handleApprove's
    // own comment on why) that this test doesn't need to pin down.
    expect(
      await screen.findByText(/Couldn't complete the approval\. Try again\./),
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

// Regression coverage for the original reported bug: useEnableGasSniper/
// useDisableGasSniper's onSuccess fired queryClient.invalidateQueries()
// without returning it, so mutateAsync() in handleToggle — and therefore
// the success toast right after it — resolved as soon as the enable/
// disable POST itself succeeded, before the status query's own background
// refetch had actually landed. The toggle (checked={isEnabled}, derived
// from that query) stayed showing the pre-click value until that refetch
// happened to catch up on its own, which read as "needs a second click."
//
// That was fixed once by awaiting invalidateQueries() (still true below —
// the toast still doesn't fire until it resolves). It broke a second time
// for an unrelated reason: this app's QueryClient defaults every query to
// `refetchOnWindowFocus: true` (see main.jsx), and a later, unrelated
// mobile fix elsewhere in this same card started calling window.focus()
// unconditionally — which can itself fire a real `focus` event, fanning
// out into a refetch of every mounted query including this status read,
// racing against the toggle's own invalidate-triggered refetch and
// occasionally losing, landing stale data right as the toggle re-rendered.
// The fix this time doesn't depend on that refetch's timing at all:
// onSuccess now also calls setQueryData with the outcome the mutation
// itself already knows happened (see useLoopsQueries.js), so the toggle
// flips the instant the enable/disable call succeeds — before the slower,
// separately-delayed status refetch even lands, not after it.
//
// `statusDelayMs` still exists to make that ordering observable: it slows
// only the GET this card's toggle used to depend on, not the POST the
// toggle now updates from directly. Every mock response is otherwise
// in-process/instant, so without a real gap between the two, a retrying
// `findByText` can't tell "updated immediately from the POST" apart from
// "happened to also catch the GET landing a few ms later."
describe("GasSniperCard — single-click toggle completes without a second click", () => {
  it("OFF → ON: the toggle flips immediately from the enable call itself, the toast confirms once the slower status refetch also lands", async () => {
    mockGasSniperBackend({ statusDelayMs: 300 });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);

    // Well before the 300ms-delayed status GET could possibly have
    // resolved — if the toggle hasn't moved by here, it's still depending
    // on that slow refetch instead of the enable call's own known outcome.
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));

    // Mid-flight, 150ms into the still-in-progress 300ms status refetch:
    // the toggle is already correct, but the toast — gated on
    // invalidateQueries() actually resolving, same as before — must not
    // have fired yet. If it has, onSuccess stopped awaiting that refetch
    // again, the original regression this describe block exists for.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText("Gas Sniper enabled")).not.toBeInTheDocument();

    await screen.findByText("Gas Sniper enabled", {}, { timeout: 2000 });
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("ON → OFF: the toggle flips immediately from the disable call itself, the toast confirms once the slower status refetch also lands", async () => {
    mockGasSniperBackend({ initiallyOptedIn: [TEST_ADDRESSES.primary], statusDelayMs: 300 });
    mockCoston2Rpc({ isApproved: true });
    useAuthStore.setState({ token: "t", authenticatedAddress: TEST_ADDRESSES.primary });

    renderCard({ wagmi: { connected: true, address: TEST_ADDRESSES.primary } });
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText("Gas Sniper disabled")).not.toBeInTheDocument();

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
