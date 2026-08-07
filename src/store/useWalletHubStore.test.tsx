import { describe, it, expect } from "vitest";
import { useConnection, useConnections, useDisconnect } from "wagmi";

import { useWalletHubStore, useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";
import { http, HttpResponse } from "msw";

const { primary: PRIMARY, watchlist: WATCHLIST, stale: STALE } = TEST_ADDRESSES;

// Layer 1 — reconcileActiveAddress in isolation. This is the exact
// function whose empty-wallets branch caused the real incident: an
// activeAddress from a previous session staying visible forever after a
// genuine disconnect + logout, because the old code couldn't tell "still
// resolving" apart from "genuinely, resolvedly empty." Every branch below
// maps directly to a comment in the function itself.
describe("reconcileActiveAddress", () => {
  type ReconcileArgs = Parameters<
    ReturnType<typeof useWalletHubStore.getState>["reconcileActiveAddress"]
  >;
  const reconcile = (...args: ReconcileArgs) =>
    useWalletHubStore.getState().reconcileActiveAddress(...args);
  const activeAddress = () => useWalletHubStore.getState().activeAddress;

  it("leaves activeAddress untouched when it's still in allWallets", () => {
    useWalletHubStore.setState({ activeAddress: PRIMARY });
    reconcile([{ address: PRIMARY, type: "connected" }], false);
    expect(activeAddress()).toBe(PRIMARY);
  });

  it("waits (doesn't clear) when allWallets is empty but still resolving", () => {
    useWalletHubStore.setState({ activeAddress: PRIMARY });
    reconcile([], true);
    expect(activeAddress()).toBe(PRIMARY);
  });

  it("clears a stale activeAddress once allWallets is empty and resolution has settled — the actual bug fix", () => {
    useWalletHubStore.setState({ activeAddress: PRIMARY });
    reconcile([], false);
    expect(activeAddress()).toBe("");
  });

  it("stays empty when there was nothing active and nothing resolved", () => {
    reconcile([], false);
    expect(activeAddress()).toBe("");
  });

  it("waits rather than snapping to the primary wallet while a watchlist wallet hasn't arrived yet", () => {
    // allWallets already has the primary (resolves first via wagmi), but
    // the previously-active *watchlist* wallet genuinely just hasn't
    // arrived from the backend yet — isResolving=true (watchlist still
    // loading) must not be treated as "that wallet was removed."
    useWalletHubStore.setState({ activeAddress: WATCHLIST });
    reconcile([{ address: PRIMARY, type: "connected" }], true);
    expect(activeAddress()).toBe(WATCHLIST);
  });

  it("falls back to the first wallet once resolution has settled and the active address is genuinely gone", () => {
    useWalletHubStore.setState({ activeAddress: STALE });
    reconcile(
      [
        { address: PRIMARY, type: "connected" },
        { address: WATCHLIST, type: "tracked" },
      ],
      false,
    );
    expect(activeAddress()).toBe(PRIMARY);
  });

  it("resolves to the first wallet on a fresh session with nothing active yet", () => {
    reconcile([{ address: PRIMARY, type: "connected" }], false);
    expect(activeAddress()).toBe(PRIMARY);
  });

  it("clears to empty on disconnect rather than snapping to a remaining watchlist wallet — the real incident this fixes", () => {
    // The connected wallet (PRIMARY) just disconnected — WATCHLIST is
    // still a perfectly valid, available wallet, but `allWallets` no
    // longer contains any `type: "connected"` entry at all, which is what
    // tells this apart from "a tracked wallet was merely removed" (the
    // case below, where a connected entry is still present). Without that
    // distinction, this would fall through to the exact same "fall back
    // to the first available wallet" logic as that case, silently
    // switching every wallet-scoped card to WATCHLIST's data instead of
    // showing "no wallet connected."
    useWalletHubStore.setState({ activeAddress: PRIMARY });
    reconcile([{ address: WATCHLIST, type: "tracked" }], false);
    expect(activeAddress()).toBe("");
  });
});

// Layer 2 — useDerivedWalletHub, exercised through a real render so
// isResolving's three real inputs (this store's own hydration, wagmi's
// isReconnecting, and — once signed in — the watchlist query's loading
// state) actually combine the way they do in the app, not as a
// hand-provided boolean like layer 1 above.
function WalletHubProbe() {
  // Matches every real call site (WalletBalancesCard, FtsoRewards, etc.)
  // exactly: connectedAddress/isConnected come from wagmi's own
  // useConnection(), never hand-supplied — a hardcoded `false` here would
  // silently ignore whatever the mock connector actually reports.
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress, allWallets, isActivePrimary } = useDerivedWalletHub(
    connectedAddress,
    isConnected,
  );
  // Mirrors useDisconnectAllWallets.ts exactly (real useDisconnect() against
  // every live connection) — a real disconnect through the same path the
  // app itself uses, not a hand-simulated `isConnected: false` prop, is
  // what actually exercises the isConnected:true->false transition
  // reconcileActiveAddress's `justDisconnected` depends on.
  const { mutateAsync: disconnectAsync } = useDisconnect();
  const connections = useConnections();
  const disconnectAll = async () => {
    for (const connection of connections) {
      await disconnectAsync({ connector: connection.connector }).catch(() => {});
    }
  };
  return (
    <div>
      <p>activeAddress: {activeAddress || "(none)"}</p>
      <p>allWallets: {allWallets.map((w) => w.address).join(",") || "(none)"}</p>
      <p>isActivePrimary: {String(isActivePrimary)}</p>
      <button type="button" onClick={disconnectAll}>
        Disconnect
      </button>
    </div>
  );
}

describe("useDerivedWalletHub", () => {
  it("resolves to no active address with no wallet connected and no session", async () => {
    renderWithProviders(<WalletHubProbe />);
    await waitFor(() => {
      expect(screen.getByText("activeAddress: (none)")).toBeInTheDocument();
    });
  });

  it("resolves activeAddress to the connected primary wallet", async () => {
    renderWithProviders(<WalletHubProbe />, { wagmi: { connected: true, address: PRIMARY } });
    await waitFor(() => {
      expect(screen.getByText(`activeAddress: ${PRIMARY.toLowerCase()}`, { exact: false })).toBeInTheDocument();
    });
    expect(screen.getByText("isActivePrimary: true")).toBeInTheDocument();
  });

  it("includes both primary and watchlist wallets once signed in, and keeps a selected watchlist wallet active", async () => {
    server.use(
      http.get(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ wallets: [{ address: WATCHLIST, nickname: "Cold Storage" }] }),
      ),
    );
    useAuthStore.setState({ token: "test-token", authenticatedAddress: PRIMARY });

    renderWithProviders(<WalletHubProbe />, { wagmi: { connected: true, address: PRIMARY } });

    await waitFor(() => {
      expect(screen.getByText(/allWallets:.*,/i)).toBeInTheDocument();
    });
    const allWalletsText = screen.getByText(/^allWallets:/).textContent;
    expect(allWalletsText.toLowerCase()).toContain(WATCHLIST.toLowerCase());

    // Explicitly select the watchlist wallet — activeAddress should stick
    // to it, not snap back to the primary wallet just because the primary
    // resolved first (the exact "primary vs. watchlist selection" bug
    // class this phase exists to protect).
    useWalletHubStore.getState().switchActiveAddress(WATCHLIST);
    await waitFor(() => {
      expect(screen.getByText(`activeAddress: ${WATCHLIST.toLowerCase()}`, { exact: false })).toBeInTheDocument();
    });
  });

  it("resets activeAddress to empty on a real disconnect, even with a watchlist wallet still available — the reported dashboard-wide stale-data bug", async () => {
    server.use(
      http.get(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ wallets: [{ address: WATCHLIST, nickname: "Cold Storage" }] }),
      ),
    );
    useAuthStore.setState({ token: "test-token", authenticatedAddress: PRIMARY });

    renderWithProviders(<WalletHubProbe />, { wagmi: { connected: true, address: PRIMARY } });

    // Let both the connected wallet and the watchlist wallet resolve, with
    // the connected primary active — the exact "connected + browsing with
    // a wallet also tracked" state a real disconnect starts from.
    await waitFor(() => {
      expect(screen.getByText(`activeAddress: ${PRIMARY.toLowerCase()}`, { exact: false })).toBeInTheDocument();
    });
    await waitFor(() => {
      const allWalletsText = screen.getByText(/^allWallets:/).textContent ?? "";
      expect(allWalletsText.toLowerCase()).toContain(WATCHLIST.toLowerCase());
    });

    fireEvent.click(screen.getByText("Disconnect"));

    // Must land on "no wallet active," never silently switch to the
    // still-available WATCHLIST entry — that silent switch, not a lack of
    // reactivity, was the actual bug (every wallet-scoped card kept
    // rendering *real* data, just for the wrong wallet).
    await waitFor(() => {
      expect(screen.getByText("activeAddress: (none)")).toBeInTheDocument();
    });
    expect(screen.queryByText(`activeAddress: ${WATCHLIST.toLowerCase()}`, { exact: false })).not.toBeInTheDocument();
  });

  it("waits for useAuthStore's own hydration too, rather than reconciling against a momentarily-wrong hasSession=false", async () => {
    // Simulates the real race: useAuthStore hasn't finished rehydrating
    // its persisted token yet (hasHydrated stays at its true default,
    // `false`, and `token` at its default `null`) even though
    // useWalletHubStore's own hydration and wagmi's reconnect have
    // already settled, with a previously-selected watchlist wallet
    // already in memory (as if restored from this store's own persisted
    // state). Without folding useAuthStore's hydration into `isResolving`,
    // `hasSession` reads `false` here, the (empty, guest-fallback)
    // `allWallets` doesn't contain WATCHLIST, and reconciliation used to
    // treat that as fully resolved and reset activeAddress to the primary
    // wallet before auth had even had a chance to rehydrate.
    // Real `persist` hydration only ever runs once per store, at module
    // load — by the time this test runs, useAuthStore's own one-time
    // hydration has long since completed, so its "hasn't hydrated yet"
    // state has to be forced explicitly here to simulate the race at all.
    useAuthStore.setState({ token: null, authenticatedAddress: null, hasHydrated: false });
    useWalletHubStore.setState({ activeAddress: WATCHLIST, hasHydrated: true });
    server.use(
      http.get(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ wallets: [{ address: WATCHLIST, nickname: "Cold Storage" }] }),
      ),
    );

    renderWithProviders(<WalletHubProbe />, { wagmi: { connected: true, address: PRIMARY } });

    // Wait for wagmi's own connection to actually settle (allWallets
    // reflecting the primary wallet) — the reconcile effect depends on
    // `allWallets`, so this is the point it's guaranteed to have run at
    // least once with useAuthStore still deliberately held at "not
    // hydrated." The regression this guards against is a *premature*
    // reconcile landing in exactly this window.
    await waitFor(() => {
      const allWalletsText = screen.getByText(/^allWallets:/).textContent ?? "";
      expect(allWalletsText.toLowerCase()).toContain(PRIMARY.toLowerCase());
    });
    expect(screen.getByText(`activeAddress: ${WATCHLIST.toLowerCase()}`, { exact: false })).toBeInTheDocument();

    // Now let auth catch up, atomically, the way onRehydrateStorage
    // actually flips it — the watchlist wallet should still end up active
    // once everything has genuinely settled.
    useAuthStore.setState({ token: "test-token", authenticatedAddress: PRIMARY, hasHydrated: true });
    await waitFor(() => {
      expect(screen.getByText(`activeAddress: ${WATCHLIST.toLowerCase()}`, { exact: false })).toBeInTheDocument();
    });
  });

  it("stays signed in with no active wallet when disconnected but not logged out", async () => {
    // Auth and wallet connection are deliberately decoupled in this app
    // (see useAuthStore.js) — being signed in with the wallet disconnected
    // must not silently pretend a wallet is still active.
    useAuthStore.setState({ token: "test-token", authenticatedAddress: PRIMARY });
    renderWithProviders(<WalletHubProbe />);
    await waitFor(() => {
      expect(screen.getByText("activeAddress: (none)")).toBeInTheDocument();
    });
  });
});
