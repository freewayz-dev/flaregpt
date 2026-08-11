import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, createConnector, http } from "wagmi";
import type { Connector } from "wagmi";
import { mainnet } from "wagmi/chains";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";
import type { Address } from "viem";

import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import { mipdStore } from "@/config/web3Config";
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
  const getProviderSpy = vi.fn();
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
      getProviderSpy();
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
  return { connector, modalClose, disconnect, connectSpy, getProviderSpy };
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

// A connector whose connect() rejects immediately with a caller-supplied
// error — for exercising getFriendlyErrorMessage's own classification
// logic (network failure / provider gone / rejected / generic) against a
// real wagmi `error` state, not a hand-built one.
function createFailingConnectorStub(id: string, error: Error) {
  const connector = createConnector(() => ({
    id,
    name: id,
    type: "walletConnect",
    connect: (async () => {
      throw error;
    }) as unknown as Connector["connect"],
    async disconnect() {},
    async getProvider() {
      return {};
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
  return { connector };
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
// `provider.session` and skips pairing once one exists) — so a *later*
// connect() call for the same connector resolves off the settled session
// instead of hanging like the first one did. `failPendingAttempt()`
// separately simulates the *original* attempt finally giving up on its own
// (a real relay eventually erroring, or ConnectWalletModal's own
// CONNECT_TIMEOUT_MS aborting it) — reconciliation is only ever supposed to
// act after that happens, never while the original call is still
// outstanding (see isConnectingRef's own comment in the component).
function createResumeReconciliationStub(id: string) {
  const modalClose = vi.fn();
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const connectSpy = vi.fn();
  let sessionSettled = false;
  let pendingReject: ((error: Error) => void) | null = null;
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
      return new Promise<never>((_resolve, reject) => {
        pendingReject = reject;
      });
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
    failPendingAttempt: () => {
      pendingReject?.(new Error("stub: original attempt gave up"));
      pendingReject = null;
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

// The reconciliation effect's own guard chain is several microtasks deep
// (isAuthorized() -> .then() -> runConnect() -> connectAsync() -> the
// connector's own connect()) — asserting a call count immediately after
// simulateAppForegrounded() (no await at all) checks before any of that has
// had a chance to run, which would make a "this must NOT happen" assertion
// pass for the wrong reason (nothing ran yet) rather than because the guard
// actually held. Draining several microtask turns first is what makes these
// assertions genuinely discriminating — confirmed by deliberately removing
// the guard being tested and re-running: without this flush the test still
// passed (checking nothing), with it the test correctly failed.
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("ConnectWalletModal — WalletConnect resume-reconciliation (the PWA bug fix)", () => {
  // The core race-condition fix: while the *original* connectAsync() call is
  // still genuinely outstanding, a foreground event must never start a
  // second one against the same connector — even once the underlying
  // session is confirmed settled. This is the exact scenario an earlier,
  // less careful version of this effect got wrong (it called runConnect()
  // again as soon as isAuthorized() said yes, regardless of whether the
  // original call was still running) — a genuinely discriminating test,
  // not a mock that hides the race: this stub's connect() only ever settles
  // when the test explicitly tells it to, so a second call within the same
  // test would be caught immediately by the call-count assertion.
  it("never calls connect() again while the original attempt is still pending, even once the session settles", async () => {
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Connecting…")).toBeInTheDocument();

    // The wallet approved while the tab/PWA was backgrounded — the session
    // is now real and settled — but the original connect() call above is
    // deliberately still hanging (nothing has released it).
    wc.settleSession();
    simulateAppForegrounded();
    simulateAppForegrounded();
    await flushMicrotasks();

    expect(wc.connectSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("picks up a session that settled while backgrounded, once the original attempt has finished", async () => {
    const onClose = vi.fn();
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));

    wc.settleSession();
    // The original attempt finally gives up on its own — mirrors a relay
    // that eventually errors, or ConnectWalletModal's own
    // CONNECT_TIMEOUT_MS aborting it. This is what frees the mutex.
    wc.failPendingAttempt();
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));

    // No refresh, no minimize/reopen, no second tap on any wallet button —
    // just the resume event, after the original attempt is no longer
    // running. A single, fresh, non-concurrent connect() call resolves off
    // the settled session.
    simulateAppForegrounded();
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not re-attempt or show an error when the session genuinely never settled", async () => {
    const { wc } = renderWithReconciliationStub(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await waitFor(() => expect(wc.connectSpy).toHaveBeenCalledTimes(1));

    // The original attempt finished (mutex is free) but the wallet never
    // actually approved anything — e.g. the user just glanced at a
    // notification and came straight back.
    wc.failPendingAttempt();
    await flushMicrotasks();

    simulateAppForegrounded();
    simulateAppForegrounded();
    await flushMicrotasks();

    // No second connect() call, since isAuthorized() still reports false.
    expect(wc.connectSpy).toHaveBeenCalledTimes(1);
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

    // isConnected is already true by this point — enough on its own to make
    // resume events after a real connection pure no-ops, not extra
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

// Regression coverage for the real desktop bug this app already fixed once
// (see findRdnsConnector's own comment): a wallet other than MetaMask
// (Rabby, in the original incident) occupying window.ethereum can make a
// genuinely-installed MetaMask undiscoverable via any window.ethereum-based
// check — only EIP-6963 finds it regardless of who owns that global. Adding
// MetaMask's dedicated mobile connector (metaMaskSDK, which declares its own
// `rdns: ["io.metamask", ...]`) stops wagmi from auto-generating its usual
// "io.metamask" passthrough connector for this — see web3Config.ts's own
// comment — so this suite exercises the replacement mechanism directly:
// mipdStore, the same EIP-6963 registry, queried straight from its source.
describe("ConnectWalletModal — MetaMask EIP-6963 detection survives another wallet occupying window.ethereum", () => {
  const METAMASK_RDNS = "io.metamask";

  const originalEthereum = window.ethereum;

  afterEach(() => {
    mipdStore.clear();
    Object.defineProperty(window, "ethereum", { value: originalEthereum, configurable: true });
  });

  function announceMetaMaskViaEip6963() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          info: {
            uuid: "test-metamask-uuid",
            name: "MetaMask",
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
            rdns: METAMASK_RDNS,
          },
          provider: { isMetaMask: true, request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
        }),
      }),
    );
  }

  function renderWithMetaMaskConnector(ui: ReactElement) {
    const metaMask = createHangingConnectorStub("metaMask");
    const wc = createHangingConnectorStub("walletConnect");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [metaMask.connector, wc.connector],
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
    return { ...utils, metaMask, wc };
  }

  it("shows MetaMask as not detected (Install) with no EIP-6963 announcement and no window.ethereum flag", () => {
    // Baseline for the test below — confirms detection genuinely depends on
    // the EIP-6963 announcement, not some other unrelated path silently
    // marking every wallet "detected."
    renderWithMetaMaskConnector(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("MetaMask").closest("button")).toHaveTextContent("Install");
  });

  it("detects and connects to MetaMask via EIP-6963 even while Rabby occupies window.ethereum", async () => {
    // Rabby (or any other wallet) claiming the shared window.ethereum global
    // — the exact condition that hid a real MetaMask from window.ethereum-
    // based detection in the original incident.
    Object.defineProperty(window, "ethereum", {
      value: { isRabby: true, request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
      configurable: true,
    });
    announceMetaMaskViaEip6963();

    const { metaMask, wc } = renderWithMetaMaskConnector(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    // Detected — no "Install" badge despite window.ethereum belonging to a
    // different wallet.
    expect(screen.getByText("MetaMask").closest("button")).not.toHaveTextContent("Install");

    fireEvent.click(screen.getByText("MetaMask").closest("button")!);

    await waitFor(() => expect(metaMask.connectSpy).toHaveBeenCalledTimes(1));
    expect(wc.connectSpy).not.toHaveBeenCalled();
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

  it("closes AppKit's modal and disconnects the connector after WalletConnect's own 5-minute timeout", async () => {
    vi.useFakeTimers();
    const { wc } = renderWithHangingWalletConnect(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    expect(wc.modalClose).not.toHaveBeenCalled();

    // Not yet — WalletConnect's own session-PROPOSAL_EXPIRY is 5 minutes,
    // so a 30s-only wait (the old, too-aggressive budget) must not abort a
    // pairing that's still genuinely within its protocol-level window.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(wc.modalClose).not.toHaveBeenCalled();
    expect(wc.disconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60_000 - 30_000);

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

// Regression coverage for a real, confirmed bug: the error copy used to
// hardcode WalletConnect wording regardless of which connector actually
// stalled — a stuck MetaMask (or any injected) attempt showed "Couldn't
// reach WalletConnect" despite never touching WalletConnect at all. Each
// case below drives a *different* connector id through its own
// connector-specific timeout (see getConnectTimeoutMs) and asserts the
// message that's actually specific to it.
describe("ConnectWalletModal — timeout message matches the connector that actually stalled", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderWithThreeConnectors(ui: ReactElement) {
    const wc = createHangingConnectorStub("walletConnect");
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const rabby = createHangingConnectorStub("rabby");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [wc.connector, metaMaskSDK.connector, rabby.connector],
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
    return { ...utils, wc, metaMaskSDK, rabby };
  }

  it("a stuck WalletConnect attempt shows the WalletConnect-specific message after its own 5-minute budget", async () => {
    vi.useFakeTimers();
    renderWithThreeConnectors(<ConnectWalletModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await vi.advanceTimersByTimeAsync(5 * 60_000);

    expect(
      screen.getByText("WalletConnect took too long to respond. If you're still approving in your wallet, please try again once you're done."),
    ).toBeInTheDocument();
  });

  it("a stuck MetaMask attempt shows the MetaMask-specific message after its own ~130s budget, not WalletConnect's", async () => {
    vi.useFakeTimers();
    // No injected/EIP-6963 MetaMask provider stubbed, and a mobile UA — so
    // handleConnect's dedicatedConnectorId branch routes straight to the
    // "metaMaskSDK" stub, the same path a real mobile MetaMask click takes.
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      onLine: true,
    });
    const { metaMaskSDK } = renderWithThreeConnectors(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("MetaMask").closest("button")!);
    await flushMicrotasks();
    expect(metaMaskSDK.connectSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(130_000);

    expect(
      screen.getByText("MetaMask took too long to respond. If you're still approving in the app, please try again once you're done."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("WalletConnect took too long to respond. If you're still approving in your wallet, please try again once you're done."),
    ).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("a stuck attempt on an injected connector (e.g. Rabby) shows the generic message after 30s, not WalletConnect's", async () => {
    vi.useFakeTimers();
    // Rabby detected as injected — handleConnect's `detected` branch
    // resolves straight to the real connector (resolveConnector's
    // connectorId fallback finds this stub via wallet.connectorId
    // "rabby"), the same path a real desktop extension click takes.
    const originalEthereum = window.ethereum;
    Object.defineProperty(window, "ethereum", {
      value: { isRabby: true, request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
      configurable: true,
    });

    const { rabby, wc, metaMaskSDK } = renderWithThreeConnectors(
      <ConnectWalletModal isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Rabby Wallet").closest("button")!);
    await flushMicrotasks();
    expect(rabby.connectSpy).toHaveBeenCalledTimes(1);
    // Injected/extension connectors keep the original, shorter 30s budget
    // — no OS handoff or relay round-trip to wait out for these.
    await vi.advanceTimersByTimeAsync(30_000);

    expect(
      screen.getByText("This wallet took too long to respond. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("WalletConnect took too long to respond. If you're still approving in your wallet, please try again once you're done."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("MetaMask took too long to respond. If you're still approving in the app, please try again once you're done."),
    ).not.toBeInTheDocument();
    expect(wc.connectSpy).not.toHaveBeenCalled();
    expect(metaMaskSDK.connectSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "ethereum", { value: originalEthereum, configurable: true });
  });
});

// Regression coverage for the actual reported bug: a fixed 30s budget was
// firing while the user was still legitimately inside the wallet app
// waiting for the confirmation prompt. These prove the *extended* per-
// connector budgets from getConnectTimeoutMs actually take effect — not
// just that the timeout eventually fires (already covered above), but
// that it deliberately does NOT fire early anymore.
describe("ConnectWalletModal — extended per-connector budgets tolerate a slow wallet confirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a MetaMask attempt taking longer than 30s (but under its own ~130s budget) is still shown as connecting, not timed out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      onLine: true,
    });
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [metaMaskSDK.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    render(<ConnectWalletModal isOpen onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    fireEvent.click(screen.getByText("MetaMask").closest("button")!);
    await flushMicrotasks();

    // Well past the old flat 30s budget — the exact scenario reported live
    // ("I took a while to approve, then got an error the moment I came
    // back") — but still short of MetaMask's own ~130s budget.
    await vi.advanceTimersByTimeAsync(100_000);

    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(
      screen.queryByText("MetaMask took too long to respond. If you're still approving in the app, please try again once you're done."),
    ).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("a WalletConnect attempt taking longer than 30s eventually succeeds instead of being cut off", async () => {
    vi.useFakeTimers();
    const wc = createResumeReconciliationStub("walletConnect");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [wc.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    const onClose = vi.fn();
    render(<ConnectWalletModal isOpen onClose={onClose} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(45_000);

    // The wallet approves well past the old 30s budget — connect()'s own
    // fast path (checked in the real @wagmi/connectors source: `if
    // (!provider.session) ...`) means this stub's hanging connect() call
    // can't resolve on its own without the test driving it, so this
    // exercises the same "wallet finally responds" moment directly rather
    // than needing the resume-reconciliation machinery to be involved.
    wc.settleSession();
    wc.failPendingAttempt();
    await flushMicrotasks();

    expect(
      screen.queryByText("WalletConnect took too long to respond. If you're still approving in your wallet, please try again once you're done."),
    ).not.toBeInTheDocument();
  });

  // Pre-warming (see the modal's own useEffect) — proves the actual root
  // cause fix for "tap MetaMask, UI says Connecting…, MetaMask never
  // opens": by the time a real tap happens, the dynamic import chain
  // should already be resolved rather than starting cold.
  it("pre-warms the dedicated MetaMask connector's provider as soon as the modal opens on mobile, before any tap", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      onLine: true,
    });
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [metaMaskSDK.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    render(<ConnectWalletModal isOpen onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    await waitFor(() => expect(metaMaskSDK.getProviderSpy).toHaveBeenCalled());
    // Prewarming reads the provider only — it must never itself start a
    // real connection attempt (that's still exclusively a tap's job).
    expect(metaMaskSDK.connectSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not pre-warm anything on desktop (not mobile) even with MetaMask undetected", async () => {
    // Default jsdom UA — not mobile. handleConnect would send an
    // undetected desktop MetaMask to the install-page branch, never to
    // metaMaskSDK, so pre-warming it here would be pure waste.
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [metaMaskSDK.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    render(<ConnectWalletModal isOpen onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    await flushMicrotasks();
    expect(metaMaskSDK.getProviderSpy).not.toHaveBeenCalled();
  });

  it("does not pre-warm the dedicated connector when MetaMask is already detected as injected, even on a mobile UA", async () => {
    // MetaMask's own in-app mobile browser: a mobile UA, but the real
    // extension-equivalent injected provider is already present — the
    // detected branch (handleConnect's own `detected` check) would use it
    // directly, never touching metaMaskSDK at all.
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      onLine: true,
    });
    const originalEthereum = window.ethereum;
    Object.defineProperty(window, "ethereum", {
      value: { isMetaMask: true, request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
      configurable: true,
    });
    const metaMaskSDK = createHangingConnectorStub("metaMaskSDK");
    const metaMask = createHangingConnectorStub("metaMask");
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [metaMask.connector, metaMaskSDK.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    render(<ConnectWalletModal isOpen onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    await flushMicrotasks();
    expect(metaMaskSDK.getProviderSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "ethereum", { value: originalEthereum, configurable: true });
    vi.unstubAllGlobals();
  });
});

describe("ConnectWalletModal — network/transport failure gets its own message", () => {
  it("shows the network-failure message, not the generic one, for a fetch-style failure", async () => {
    const failing = createFailingConnectorStub("walletConnect", new Error("Failed to fetch"));
    const wagmiConfig = createConfig({
      chains: [mainnet],
      connectors: [failing.connector],
      transports: { [mainnet.id]: http() },
    });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    render(<ConnectWalletModal isOpen onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={testQueryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </WagmiProvider>
      ),
    });

    fireEvent.click(screen.getByText("WalletConnect").closest("button")!);

    expect(
      await screen.findByText("Couldn't reach the network. Please check your connection and try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("An unexpected connection error occurred. Please try again or use another wallet."),
    ).not.toBeInTheDocument();
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
