import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, createConnector, http } from "wagmi";
import type { Connector } from "wagmi";
import { mainnet } from "wagmi/chains";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";
import type { Address } from "viem";

import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import { renderWithProviders, screen, render, fireEvent, waitFor } from "@/test/test-utils";

// A hand-rolled stand-in for wagmi's real `walletConnect()` connector —
// `createTestWagmiConfig` (mocks/wagmi.ts) only ever wires up the `mock`
// connector, which has no `getProvider().modal` to assert against. This
// mirrors just enough of the real connector's shape (a `connect()` this
// test can leave hanging to simulate a stuck pairing attempt, and a
// `getProvider()` returning an object with a spy-able `.modal.close`) to
// exercise the actual cleanup path this file added, not a simplified
// reimplementation of it. `id` is passed in so a second instance can reuse
// "io.metamask" — matching MetaMask's `rdns` in VISUAL_WALLETS is what
// makes `isWalletDetected` treat it as a distinct, already-detected wallet
// instead of falling through to the WalletConnect fallback path.
function createHangingConnectorStub(id: string) {
  const modalClose = vi.fn();
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const connectSpy = vi.fn();
  const connector = createConnector(() => ({
    id,
    name: id,
    type: "walletConnect",
    // Never resolves or rejects — simulates a pairing request the relay
    // never answers, the exact condition under investigation.
    async connect() {
      connectSpy();
      return new Promise<never>(() => {});
    },
    async disconnect() {
      await disconnect();
    },
    async getProvider() {
      return { modal: { close: modalClose } };
    },
    async getAccounts() {
      return [];
    },
    async getChainId() {
      return mainnet.id;
    },
    async isAuthorized() {
      return false;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
  return { connector, modalClose, disconnect, connectSpy };
}

// Same shape as createHangingConnectorStub, except `connect()` actually
// resolves — simulating a wallet that genuinely connects, the case the
// regression below is about. `id` deliberately matches MetaMask's `rdns`
// (same reasoning as createHangingConnectorStub) so clicking "MetaMask"
// resolves straight to this connector.
const TEST_ADDRESS: Address = "0x1111111111111111111111111111111111111111";
function createResolvingConnectorStub(id: string) {
  const modalClose = vi.fn();
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const connector = createConnector(() => ({
    id,
    name: id,
    type: "injected",
    // Cast via `unknown` — this stub only ever needs the (default,
    // non-capabilities) shape ConnectWalletModal actually calls connect()
    // with; matching the real connector's fully generic `withCapabilities`
    // signature exactly isn't worth the type gymnastics for a test double.
    connect: (async () => ({
      accounts: [TEST_ADDRESS],
      chainId: mainnet.id,
    })) as unknown as Connector["connect"],
    async disconnect() {
      await disconnect();
    },
    async getProvider() {
      return { modal: { close: modalClose } };
    },
    async getAccounts() {
      return [TEST_ADDRESS];
    },
    async getChainId() {
      return mainnet.id;
    },
    async isAuthorized() {
      return false;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
  return { connector, modalClose, disconnect };
}

function renderWithHangingWalletConnect(ui: ReactElement) {
  const wc = createHangingConnectorStub("walletConnect");
  const metaMask = createHangingConnectorStub("io.metamask");
  const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors: [wc.connector, metaMask.connector],
    transports: { [mainnet.id]: http() },
  });
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  // Passed via the `wrapper` render option (not composed inline around
  // `ui`) specifically so `rerender()` reuses this same provider tree
  // instead of unmounting it — needed for the "close the dialog mid-
  // attempt" test below, which rerenders with a new `isOpen` prop.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  const utils = render(ui, { wrapper: Wrapper });
  return { ...utils, wc, metaMask };
}

function renderWithResolvingMetaMask(ui: ReactElement) {
  const metaMask = createResolvingConnectorStub("io.metamask");
  const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors: [metaMask.connector],
    transports: { [mainnet.id]: http() },
  });
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  const utils = render(ui, { wrapper: Wrapper });
  return { ...utils, metaMask };
}

// Simulates the exact production bug under investigation: a WalletConnect
// connect() call that hangs (relay/WebSocket never delivers the session
// approval to *this* in-flight promise — see the resume-reconciliation
// effect's own comment in ConnectWalletModal.tsx for the full mechanism),
// while the underlying session actually settles in the background — the
// same way MetaMask/Trust Wallet/Bifrost approving mid-backgrounding
// settles a real WalletConnect session independently of whether this tab's
// own JS was suspended for it. `settleSession()` flips both `isAuthorized()`
// (what the reconciliation effect probes) and `connect()`'s own fast-path
// branch (mirroring @wagmi/connectors' real walletConnect.ts, which checks
// `provider.session` and skips pairing once one exists) — so a *second*
// connect() call for the same connector resolves off the settled session
// instead of hanging like the first one did.
function createResumeReconciliationStub(id: string) {
  const modalClose = vi.fn();
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const connectSpy = vi.fn();
  let sessionSettled = false;
  const connector = createConnector(() => ({
    id,
    name: id,
    type: "walletConnect",
    // Cast via `unknown` — same rationale as createResolvingConnectorStub
    // above: this stub only needs the default (non-capabilities) shape.
    connect: (async () => {
      connectSpy();
      if (sessionSettled) {
        return { accounts: [TEST_ADDRESS], chainId: mainnet.id };
      }
      return new Promise<never>(() => {});
    }) as unknown as Connector["connect"],
    async disconnect() {
      await disconnect();
    },
    async getProvider() {
      return { modal: { close: modalClose } };
    },
    async getAccounts() {
      return sessionSettled ? [TEST_ADDRESS] : [];
    },
    async getChainId() {
      return mainnet.id;
    },
    async isAuthorized() {
      return sessionSettled;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
  return {
    connector,
    modalClose,
    disconnect,
    connectSpy,
    settleSession: () => {
      sessionSettled = true;
    },
  };
}

function renderWithReconciliationStub(ui: ReactElement) {
  const wc = createResumeReconciliationStub("walletConnect");
  const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors: [wc.connector],
    transports: { [mainnet.id]: http() },
  });
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  const utils = render(ui, { wrapper: Wrapper });
  return { ...utils, wc };
}

// Dispatches the same event pair the real reconciliation effect listens
// for on the real app returning to the foreground — `visibilityState` has
// to be stubbed first since jsdom's own default is always "visible" and
// never actually changes on its own.
function simulateAppForegrounded() {
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("ConnectWalletModal — WalletConnect resume-reconciliation (the PWA bug fix)", () => {
  it("picks up a session that settled while backgrounded, without a second wallet interaction", async () => {
    const onClose = vi.fn();
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));
    // Still hanging — this is the exact "returned to the PWA, nothing
    // happens" moment from the bug report.
    expect(screen.getByText("Connecting…")).toBeInTheDocument();

    // The wallet approved while the tab/PWA was backgrounded — the session
    // is now real and settled, independent of the still-hanging first
    // connect() call above.
    wc.settleSession();
    simulateAppForegrounded();

    // No refresh, no minimize/reopen, no second tap on any wallet button —
    // just the resume event. isConnected flipping true is what triggers the
    // modal's own existing auto-close effect (onClose — the parent, e.g.
    // Sidebar/Navbar, owns actually flipping the `isOpen` prop off it gets
    // called with, same as every other test in this file).
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not re-attempt or show an error when the session has not actually settled yet", async () => {
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));

    // A resume event with nothing to reconcile yet — e.g. the user just
    // glanced at a notification and came straight back, the wallet app
    // never actually approved anything.
    simulateAppForegrounded();
    simulateAppForegrounded();

    // Still just the one original attempt — no duplicate connect() calls,
    // and the dialog is still showing the normal "connecting" state, not
    // an error.
    expect(wc.connectSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(screen.queryByText("You're offline. Connecting a wallet needs an internet connection.")).not.toBeInTheDocument();
  });

  it("does not fire when there is no pending WalletConnect attempt at all", async () => {
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    // Never clicked any wallet button — an ordinary, unrelated tab/app
    // switch (checking a text message, etc.) must not touch WalletConnect
    // at all, let alone lazily initialize its provider.
    simulateAppForegrounded();

    expect(wc.connectSpy).not.toHaveBeenCalled();
  });

  it("does not reconcile once a connection already succeeded", async () => {
    const onClose = vi.fn();
    const { wc, rerender } = renderWithReconciliationStub(
      <ConnectWalletModal isOpen onClose={onClose} />,
    );

    wc.settleSession();
    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    rerender(<ConnectWalletModal isOpen={false} onClose={onClose} />);

    const callsAfterConnect = wc.connectSpy.mock.calls.length;
    simulateAppForegrounded();
    simulateAppForegrounded();

    // Both of the reconciliation guard's checks are already false by this
    // point: runConnect's own `finally` already cleared
    // pendingConnectorRef.current once the connector resolved (regardless
    // of isOpen), and isConnected is true — either guard alone is enough
    // to make resume events after a real connection pure no-ops, not extra
    // connect() calls.
    expect(wc.connectSpy.mock.calls.length).toBe(callsAfterConnect);
  });
});

// Regression coverage for the other half of the same change: MetaMask
// (undetected, i.e. mobile with no injected provider) must resolve to its
// own dedicated "metaMaskSDK" connector, not the generic walletConnect
// fallback every other undetected wallet still uses. Both connectors are
// present in the same config here specifically so a bug that routed
// MetaMask through the wrong one would be caught by *which* spy fired, not
// just whether some connector fired.
describe("ConnectWalletModal — MetaMask uses its dedicated connector, other wallets stay on WalletConnect", () => {
  // handleConnect's fallback-to-WalletConnect/dedicated-connector branches
  // are mobile-only (see ConnectWalletModal.tsx: a desktop miss goes to the
  // install-page branch instead) — jsdom's own default userAgent isn't a
  // mobile one, so isMobileDevice() would otherwise silently route through
  // the "open install page" branch instead of the one under test here.
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      // `onLine` lives on Navigator.prototype as a getter, not an own
      // property — the shallow `{...window.navigator}` spread above
      // doesn't carry it over, which left every wallet button disabled
      // ("You're offline…") under useOnlineStatus() until this was added
      // explicitly.
      onLine: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderWithBothConnectors(ui: ReactElement) {
    const wc = createHangingConnectorStub("walletConnect");
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [wc.connector, metaMaskSDK.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      );
    }
    const utils = render(ui, { wrapper: Wrapper });
    return { ...utils, wc, metaMaskSDK };
  }

  it("MetaMask (not detected as injected) connects via the dedicated metaMaskSDK connector, not WalletConnect", async () => {
    const { wc, metaMaskSDK } = renderWithBothConnectors(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("MetaMask").closest("button")!);

    // The direct, discriminating signal: which stub's own connect() was
    // actually invoked — not just "some connector is now pending" (which
    // would be true either way and wouldn't catch a regression that
    // silently routed MetaMask through the wrong one).
    await waitFor(() => expect(metaMaskSDK.connectSpy).toHaveBeenCalledTimes(1));
    expect(wc.connectSpy).not.toHaveBeenCalled();
  });

  it("Bifrost (no dedicated connector) still falls through to the generic WalletConnect connector", async () => {
    const { wc, metaMaskSDK } = renderWithBothConnectors(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Bifrost Wallet").closest("button")!);

    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));
    expect(metaMaskSDK.connectSpy).not.toHaveBeenCalled();
  });
});

describe("ConnectWalletModal — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("shows an offline notice and disables every wallet button", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWithProviders(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    expect(
      await screen.findByText("You're offline. Connecting a wallet needs an internet connection."),
    ).toBeInTheDocument();

    for (const button of screen.getAllByRole("button")) {
      // The dialog's own Close (×) button must stay usable regardless —
      // only the wallet-picker buttons need a real connection.
      if (button.getAttribute("aria-label") === "Close") continue;
      expect(button).toBeDisabled();
    }
  });

  it("does not show the offline notice or disable wallet buttons while online", async () => {
    renderWithProviders(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    expect(
      screen.queryByText("You're offline. Connecting a wallet needs an internet connection."),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("MetaMask")).toBeInTheDocument();
    const metaMaskButton = screen.getByText("MetaMask").closest("button");
    expect(metaMaskButton).toBeEnabled();
  });
});

// Regression coverage for the production bug under investigation: a
// WalletConnect pairing attempt that never receives a pairing URI (relay
// never responds) previously left AppKit's own modal on screen forever —
// this app's existing 30s recovery timeout only called wagmi's
// connector.disconnect(), which is a no-op when no session was ever
// established (confirmed in @walletconnect/ethereum-provider's own
// source). These tests drive that same stuck-connector shape and assert
// the actual cleanup call (`.modal.close()`), not just that some internal
// state flag flipped.
describe("ConnectWalletModal — stuck WalletConnect attempt cleanup", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes AppKit's modal and disconnects the connector after the 30s timeout", async () => {
    vi.useFakeTimers();
    const { wc } = renderWithHangingWalletConnect(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    expect(wc.modalClose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(wc.modalClose).toHaveBeenCalledTimes(1);
    expect(wc.disconnect).toHaveBeenCalledTimes(1);
  });

  it("aborts a stuck attempt when the user closes the dialog before it times out", async () => {
    const onClose = vi.fn();
    const { wc, rerender } = renderWithHangingWalletConnect(
      <ConnectWalletModal isOpen onClose={onClose} />,
    );

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    expect(wc.modalClose).not.toHaveBeenCalled();

    // Simulate the parent responding to onClose by flipping isOpen to
    // false — exactly what Sidebar/Navbar's own wallet-modal state does.
    rerender(<ConnectWalletModal isOpen={false} onClose={onClose} />);

    // abortPendingConnector awaits connector.getProvider() before calling
    // .modal.close() — a real microtask hop, not synchronous with the
    // rerender that triggers it.
    await waitFor(() => expect(wc.modalClose).toHaveBeenCalledTimes(1));
    expect(wc.disconnect).toHaveBeenCalledTimes(1);
  });

  it("aborts a stuck attempt when a second, distinct wallet is selected before the first settles", async () => {
    const { wc, metaMask } = renderWithHangingWalletConnect(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    expect(wc.modalClose).not.toHaveBeenCalled();

    // This stub's connector id ("io.metamask") matches MetaMask's `rdns`
    // in VISUAL_WALLETS, so isWalletDetected treats it as already
    // installed and handleConnect resolves straight to it — a genuinely
    // different connector than the WalletConnect one already pending.
    fireEvent.click(screen.getByText("MetaMask").closest("button")!);

    await waitFor(() => expect(wc.modalClose).toHaveBeenCalledTimes(1));
    expect(wc.disconnect).toHaveBeenCalledTimes(1);
    // The new attempt itself is untouched — only the stale one was cleaned up.
    expect(metaMask.modalClose).not.toHaveBeenCalled();
    expect(metaMask.disconnect).not.toHaveBeenCalled();
  });
});

// Regression coverage for the localhost-only bug reported live: this modal
// auto-closes itself the instant a connector succeeds (see the
// `isConnected && isOpen -> onClose()` effect above), and that state
// update could land before runConnect's own `finally` cleared
// `pendingConnectorRef.current` — so the same stuck-connector cleanup
// above ran on a connector that had just legitimately connected, calling
// its disconnect() and corrupting the connection before the sign-in flow
// (useAuthSync) ever got to use it. Confirmed live against a real dev
// server: disconnect() fires wagmi's own `wallet_revokePermissions` call
// immediately after a successful connect, before any signature prompt.
describe("ConnectWalletModal — a connector that just connected is never aborted", () => {
  it("does not disconnect the connector when the modal auto-closes after a successful connection", async () => {
    const onClose = vi.fn();
    const { metaMask, rerender } = renderWithResolvingMetaMask(
      <ConnectWalletModal isOpen onClose={onClose} />,
    );

    fireEvent.click(screen.getByText("MetaMask").closest("button")!);

    // The modal's own `isConnected && isOpen -> onClose()` effect is what
    // the parent (Sidebar/Navbar) reacts to by flipping `isOpen` false —
    // driven explicitly here, exactly like the hanging-attempt tests
    // above, rather than relying on this test component owning that state
    // itself.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    rerender(<ConnectWalletModal isOpen={false} onClose={onClose} />);

    // Give any (incorrect) abort path a real chance to run — the bug's own
    // abortPendingConnector call is itself async (awaits getProvider()
    // first), so a synchronous assertion right after rerender would pass
    // even with the bug present.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(metaMask.disconnect).not.toHaveBeenCalled();
  });

  it("still aborts a genuinely stuck (never-connected) attempt when the dialog is closed", async () => {
    // Confirms the fix didn't remove the original protection this file was
    // added for — only scoped it away from the successful-connection case.
    const onClose = vi.fn();
    const { wc, rerender } = renderWithHangingWalletConnect(
      <ConnectWalletModal isOpen onClose={onClose} />,
    );

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    expect(wc.disconnect).not.toHaveBeenCalled();

    rerender(<ConnectWalletModal isOpen={false} onClose={onClose} />);

    await waitFor(() => expect(wc.disconnect).toHaveBeenCalledTimes(1));
  });
});
