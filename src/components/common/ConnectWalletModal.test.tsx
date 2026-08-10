import { describe, it, expect, vi, afterEach } from "vitest";
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
  const connector = createConnector(() => ({
    id,
    name: id,
    type: "walletConnect",
    // Never resolves or rejects — simulates a pairing request the relay
    // never answers, the exact condition under investigation.
    async connect() {
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
  return { connector, modalClose, disconnect };
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
