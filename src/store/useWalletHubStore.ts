import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useConnection } from "wagmi";

import { useAuthStore } from "@/store/useAuthStore";
import { useWatchlist } from "@/hooks/queries/useWatchlistQueries";

// Wallet addresses here are deliberately plain `string`, not viem's
// branded `Address` — a guest's `trackedWallets` entries come straight
// from a free-typed form input (see Wallets.jsx's handleSave, which only
// checks `startsWith("0x")` and length 42, not a real EIP-55 checksum),
// so treating them as the stricter branded type here would overstate a
// guarantee this store never actually enforces.
interface TrackedWallet {
  address: string;
  label: string;
}

// The minimal shape reconcileActiveAddress itself needs — it only ever
// reads `.address` off each entry. Real callers (both useDerivedWalletHub's
// `allWallets` and useWalletHubStore.test.tsx's direct calls) always pass
// richer objects (at minimum `type`, usually `label` too), which structurally
// satisfy this narrower shape fine — only test file object *literals* need
// their extra `type` field declared here too, since literal assignment is
// where TypeScript's excess-property check actually applies.
interface ReconcileWallet {
  address: string;
  type?: string;
}

export interface WalletHubEntry extends TrackedWallet {
  type: "connected" | "tracked";
}

interface WalletHubState {
  // Guest-only, local watchlist — an authenticated user's watchlist
  // lives entirely on the backend (see useDerivedWalletHub below) and
  // never touches this field at all once signed in; see
  // useWatchlistSync.js for the one-time migration when a guest with
  // wallets already tracked here signs in for the first time.
  trackedWallets: TrackedWallet[];
  activeAddress: string;
  // zustand-persist's own hydration is deferred to a microtask — this
  // store's very first render always sees these in-code defaults
  // (`activeAddress: ""`, `trackedWallets: []`), never the persisted
  // values, until hydration actually completes a moment later (see
  // `onRehydrateStorage` below, which flips this once it does).
  // Consumers that render something definitive from "nothing here yet"
  // (e.g. the navbar's wallet-selector button asserting "Connect
  // Wallet") need this to tell "genuinely disconnected" apart from
  // "haven't heard from storage yet" — without it, a real, already-
  // configured wallet flashes as disconnected on every fresh page load.
  hasHydrated: boolean;

  switchActiveAddress: (addr: string) => void;

  // Guest-only action — see useDerivedWalletHub for the authenticated
  // equivalent (a mutation against the real API, not this store).
  addTrackedWallet: (
    address: string,
    label: string | undefined,
    connectedAddress: string | undefined,
    isConnected: boolean,
  ) => boolean;

  // Guest-only — there's no backend endpoint to rename a watchlist
  // entry yet, so this never runs for an authenticated user (see
  // Wallets.jsx, which hides the rename UI entirely once signed in).
  renameTrackedWallet: (address: string, newLabel: string) => void;

  // Guest-only action — see useDerivedWalletHub for the authenticated
  // equivalent.
  removeTrackedWallet: (
    addressToRemove: string,
    connectedAddress: string | undefined,
    isConnected: boolean,
  ) => void;

  // Keeps activeAddress pointed at a wallet that's still in the combined
  // list. Called from an effect (see useDerivedWalletHub), never during
  // render. `isResolving` (true while this store's own hydration,
  // wagmi's reconnect, or a signed-in user's watchlist fetch hasn't
  // settled yet — see useDerivedWalletHub) means "we don't have the
  // full picture yet," not "the previously-active wallet is gone."
  reconcileActiveAddress: (allWallets: ReconcileWallet[], isResolving?: boolean) => void;
}

// The backend has no enforced cap (confirmed live, up to 7 wallets added
// with no rejection) — treated as unlimited for a signed-in account.
// Guests are capped locally per the product decision to make signing in
// feel like a real upgrade rather than an arbitrary inconvenience.
const GUEST_MAX_SLOTS = 3;

const DEFAULT_TRACKED_LABEL = "Watchlist Account";

// See useAuthStore.ts for why the state creator below needs an explicit
// `: WalletHubState` return annotation — the same `persist` generic-
// inference gap, not anything specific to this store.
export const useWalletHubStore = create<WalletHubState>()(
  persist(
    (set, get): WalletHubState => ({
      // Guest-only, local watchlist — an authenticated user's watchlist
      // lives entirely on the backend (see useDerivedWalletHub below) and
      // never touches this field at all once signed in; see
      // useWatchlistSync.js for the one-time migration when a guest with
      // wallets already tracked here signs in for the first time.
      trackedWallets: [],
      activeAddress: "",
      hasHydrated: false,

      switchActiveAddress: (addr) => set({ activeAddress: addr }),

      addTrackedWallet: (address, label, connectedAddress, isConnected) => {
        const { trackedWallets } = get();
        if (trackedWallets.length >= GUEST_MAX_SLOTS) return false;

        const isDuplicate =
          trackedWallets.some((w) => w.address.toLowerCase() === address.toLowerCase()) ||
          (isConnected && connectedAddress?.toLowerCase() === address.toLowerCase());

        if (isDuplicate) return false;

        set({
          trackedWallets: [...trackedWallets, { address, label: label || DEFAULT_TRACKED_LABEL }],
        });
        return true;
      },

      renameTrackedWallet: (address, newLabel) => {
        const { trackedWallets } = get();
        set({
          trackedWallets: trackedWallets.map((w) =>
            w.address === address ? { ...w, label: newLabel } : w,
          ),
        });
      },

      removeTrackedWallet: (addressToRemove, connectedAddress, isConnected) => {
        const { trackedWallets, activeAddress, switchActiveAddress } = get();
        const updatedList = trackedWallets.filter((w) => w.address !== addressToRemove);

        set({ trackedWallets: updatedList });

        // Dynamic State Cleanup if viewing target is dropped
        if (activeAddress === addressToRemove) {
          if (isConnected && connectedAddress) {
            switchActiveAddress(connectedAddress);
          } else if (updatedList.length > 0) {
            switchActiveAddress(updatedList[0].address);
          } else {
            switchActiveAddress("");
          }
        }
      },

      reconcileActiveAddress: (allWallets, isResolving = false) => {
        const { activeAddress } = get();
        const isStillAvailable = allWallets.some((w) => w.address === activeAddress);
        if (isStillAvailable && activeAddress) return;

        // `allWallets` is empty on every fresh page load for a beat before
        // it means anything: zustand-persist's own hydration is deferred
        // to a microtask (so the very first render always sees this
        // store's in-code defaults, not localStorage), and wagmi's
        // reconnect is async on top of that — so there's a real window
        // where `allWallets` is `[]` purely because neither has resolved
        // yet, not because a previously-active wallet was actually
        // removed. `isResolving` is what tells the two apart: while it's
        // true, wait rather than wipe a perfectly valid persisted
        // activeAddress out from under a reconnect that just hasn't
        // finished yet (dashboard queries gated on `Boolean(activeAddress)`
        // would otherwise sit disabled until some unrelated event
        // re-triggered this reconcile). But once every async source this
        // depends on — this store's own hydration, wagmi's reconnect, and
        // (if signed in) the watchlist fetch — has actually settled and
        // `allWallets` is *still* empty, that's a real, resolved "nothing
        // connected" state (disconnected wallet, logged out, no watchlist),
        // and holding onto a stale address from a previous session forever
        // is exactly what left every wallet-scoped page rendering another
        // account's data with nothing connected at all.
        if (allWallets.length === 0) {
          if (isResolving) return;
          if (activeAddress) set({ activeAddress: "" });
          return;
        }

        // The connected/primary wallet routinely resolves (via wagmi's
        // reconnect) *before* a signed-in user's watchlist finishes
        // fetching from the backend — so `allWallets` can already be
        // non-empty (it has the primary wallet) while the actual
        // previously-active *watchlist* wallet genuinely just hasn't
        // arrived yet. Without this check, that transient, partial list
        // looked identical to "the watchlist wallet was removed," and this
        // fell through to the primary-wallet fallback below — which is
        // exactly why refreshing while viewing a watchlist wallet used to
        // snap back to the primary wallet every time, well before the
        // watchlist even had a chance to load.
        if (isResolving && activeAddress) return;

        const fallback = allWallets[0]?.address || "";
        if (fallback !== activeAddress) set({ activeAddress: fallback });
      },
    }),
    {
      name: "flaregpt_wallet_hub",
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

// Derivation Helper Hook: Combines Wagmi live data with either the local
// guest watchlist or (once signed in) the real backend watchlist. This is
// the single seam every consumer goes through — none of them need to know
// or care which source `trackedWallets` actually came from.
export function useDerivedWalletHub(connectedAddress: string | undefined, isConnected: boolean) {
  const hasSession = useAuthStore((state) => Boolean(state.token));
  // Not derived from the `isConnected` param above — that one's already
  // past the "haven't heard back yet" window by the time it's `false`,
  // which is exactly the case this needs to detect. `isReconnecting` is
  // the one signal that's still `true` during that window specifically.
  const { isReconnecting } = useConnection();

  const localTrackedWallets = useWalletHubStore((state) => state.trackedWallets);
  const activeAddress = useWalletHubStore((state) => state.activeAddress);
  const hasHydrated = useWalletHubStore((state) => state.hasHydrated);
  const switchActiveAddress = useWalletHubStore((state) => state.switchActiveAddress);
  const addTrackedWallet = useWalletHubStore((state) => state.addTrackedWallet);
  const removeTrackedWallet = useWalletHubStore((state) => state.removeTrackedWallet);
  const renameTrackedWallet = useWalletHubStore((state) => state.renameTrackedWallet);
  const reconcileActiveAddress = useWalletHubStore((state) => state.reconcileActiveAddress);

  // Only ever fetched once signed in (`enabled: hasSession`) — a guest's
  // watchlist never goes near react-query or the network at all.
  const {
    data: serverWallets,
    isLoading: isWatchlistLoading,
    isError: watchlistIsError,
    refetch: refetchWatchlist,
  } = useWatchlist(hasSession);

  const trackedWallets = useMemo<TrackedWallet[]>(() => {
    if (!hasSession) return localTrackedWallets;
    return (serverWallets ?? []).map((w) => ({
      address: w.address,
      label: w.nickname || DEFAULT_TRACKED_LABEL,
    }));
  }, [hasSession, localTrackedWallets, serverWallets]);

  // Unlimited once signed in (no cap enforced server-side); capped locally
  // for guests. `Number.isFinite` is how the UI (Wallets.jsx) tells these
  // two states apart to show "unlimited" framing instead of a raw number.
  const maxSlots = hasSession ? Infinity : GUEST_MAX_SLOTS;

  const allWallets = useMemo<WalletHubEntry[]>(() => {
    const list: WalletHubEntry[] = [];
    if (isConnected && connectedAddress) {
      list.push({
        address: connectedAddress,
        label: "Primary Wallet",
        type: "connected",
      });
    }
    trackedWallets.forEach((w) => {
      list.push({
        address: w.address,
        label: w.label,
        type: "tracked",
      });
    });
    return list;
  }, [connectedAddress, isConnected, trackedWallets]);

  // Safe fallback auto-resolver: runs post-commit, not as a render side
  // effect. `isResolving` combines every async source that can make
  // `allWallets` look emptier than it really is for a beat: this store's
  // own persisted-hydration delay, wagmi's silent reconnect-on-load, and
  // (once signed in) the watchlist fetch not having come back yet. See the
  // matching comment in reconcileActiveAddress for why an empty
  // `allWallets` has to gate on this rather than being treated as
  // "genuinely disconnected" on sight.
  const isResolving = !hasHydrated || isReconnecting || (hasSession && isWatchlistLoading);
  useEffect(() => {
    reconcileActiveAddress(allWallets, isResolving);
  }, [allWallets, activeAddress, isResolving, reconcileActiveAddress]);

  const activeWallet = allWallets.find((w) => w.address === activeAddress);
  // The connected wallet can perform authenticated actions (claim rewards,
  // sign transactions, later: save chat history). Tracked wallets are
  // read-only — viewing their data never implies the ability to act on it.
  const isActivePrimary = activeWallet?.type === "connected";

  return {
    trackedWallets,
    activeAddress,
    // `isConnected`/`connectedAddress` come from wagmi, whose own async
    // reconnect-on-load has the identical "haven't heard back yet" window
    // as this store's own hydration — a consumer that wants to avoid
    // asserting "disconnected" prematurely (see Navbar.jsx) needs both
    // combined into one signal, not just this store's own piece of it.
    hasHydrated,
    maxSlots,
    switchActiveAddress,
    addTrackedWallet,
    removeTrackedWallet,
    renameTrackedWallet,
    allWallets,
    remainingSlots: maxSlots - trackedWallets.length,
    isActivePrimary,
    hasSession,
    // Surfaced so a signed-in user whose watchlist fetch genuinely failed
    // (or is still paused/offline) sees that distinctly from "you have no
    // tracked wallets yet" — see Wallets.jsx, which was previously unable
    // to tell those two states apart at all.
    watchlistIsError,
    refetchWatchlist,
  };
}

export { GUEST_MAX_SLOTS };
