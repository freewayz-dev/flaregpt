// src/store/useWalletHubStore.js
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useAuthStore } from "@/store/useAuthStore";
import { useWatchlist } from "@/hooks/queries/useWatchlistQueries";

// The backend has no enforced cap (confirmed live, up to 7 wallets added
// with no rejection) — treated as unlimited for a signed-in account.
// Guests are capped locally per the product decision to make signing in
// feel like a real upgrade rather than an arbitrary inconvenience.
const GUEST_MAX_SLOTS = 3;

const DEFAULT_TRACKED_LABEL = "Watchlist Account";

export const useWalletHubStore = create()(
  persist(
    (set, get) => ({
      // Guest-only, local watchlist — an authenticated user's watchlist
      // lives entirely on the backend (see useDerivedWalletHub below) and
      // never touches this field at all once signed in; see
      // useWatchlistSync.js for the one-time migration when a guest with
      // wallets already tracked here signs in for the first time.
      trackedWallets: [],
      activeAddress: "",
      // Distinct from `activeAddress` (whatever's active *right now*,
      // which sticks to however a session left off): this is an explicit,
      // user-pinned choice that only ever matters as the fallback below,
      // when there's no valid prior session to restore — first-ever
      // visit, or the previously-active wallet was removed. Switching
      // wallets mid-session never touches this value.
      preferredDefaultAddress: "",

      switchActiveAddress: (addr) => set({ activeAddress: addr }),
      setPreferredDefaultAddress: (addr) => set({ preferredDefaultAddress: addr }),

      // Guest-only action — see useDerivedWalletHub for the authenticated
      // equivalent (a mutation against the real API, not this store).
      addTrackedWallet: (address, label, connectedAddress, isConnected) => {
        const { trackedWallets } = get();
        if (trackedWallets.length >= GUEST_MAX_SLOTS) return false;

        const isDuplicate =
          trackedWallets.some(w => w.address.toLowerCase() === address.toLowerCase()) ||
          (isConnected && connectedAddress?.toLowerCase() === address.toLowerCase());

        if (isDuplicate) return false;

        set({
          trackedWallets: [...trackedWallets, { address, label: label || DEFAULT_TRACKED_LABEL }]
        });
        return true;
      },

      // Guest-only — there's no backend endpoint to rename a watchlist
      // entry yet, so this never runs for an authenticated user (see
      // Wallets.jsx, which hides the rename UI entirely once signed in).
      renameTrackedWallet: (address, newLabel) => {
        const { trackedWallets } = get();
        set({
          trackedWallets: trackedWallets.map((w) =>
            w.address === address ? { ...w, label: newLabel } : w,
          ),
        });
      },

      // Guest-only action — see useDerivedWalletHub for the authenticated
      // equivalent.
      removeTrackedWallet: (addressToRemove, connectedAddress, isConnected) => {
        const { trackedWallets, activeAddress, switchActiveAddress } = get();
        const updatedList = trackedWallets.filter(w => w.address !== addressToRemove);

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

      // Keeps activeAddress pointed at a wallet that's still in the combined list.
      // Called from an effect (see useDerivedWalletHub), never during render.
      reconcileActiveAddress: (allWallets) => {
        const { activeAddress, preferredDefaultAddress } = get();
        const isStillAvailable = allWallets.some(w => w.address === activeAddress);
        if (isStillAvailable && activeAddress) return;

        // `allWallets` is empty on every fresh page load for a beat before
        // it means anything: zustand-persist's own hydration is deferred
        // to a microtask (so the very first render always sees this
        // store's in-code defaults, not localStorage), and wagmi's
        // reconnect is async on top of that — so there's a real window
        // where `allWallets` is `[]` purely because neither has resolved
        // yet, not because a previously-active wallet was actually
        // removed. Falling through to the "" fallback below during that
        // window used to wipe a perfectly valid persisted activeAddress
        // for however long reconnection took, and since dashboard queries
        // are gated on `Boolean(activeAddress)`, every card on the page
        // would sit disabled until *something else* (a manual wallet
        // switch, a full reload landing in a luckier timing window)
        // re-triggered this reconcile — exactly the "cards silently never
        // load, have to refresh" report this fixes. An explicit removal
        // (see removeTrackedWallet above) already clears activeAddress
        // itself when appropriate; this fallback only needs to run once
        // allWallets has *something* to actually check against.
        if (allWallets.length === 0 && activeAddress) return;

        const preferredIsAvailable = allWallets.some(w => w.address === preferredDefaultAddress);
        const fallback =
          (preferredIsAvailable && preferredDefaultAddress) || allWallets[0]?.address || "";
        if (fallback !== activeAddress) set({ activeAddress: fallback });
      },
    }),
    {
      name: "flaregpt_wallet_hub",
    }
  )
);

// Derivation Helper Hook: Combines Wagmi live data with either the local
// guest watchlist or (once signed in) the real backend watchlist. This is
// the single seam every consumer goes through — none of them need to know
// or care which source `trackedWallets` actually came from.
export function useDerivedWalletHub(connectedAddress, isConnected) {
  const hasSession = useAuthStore((state) => Boolean(state.token));

  const localTrackedWallets = useWalletHubStore((state) => state.trackedWallets);
  const activeAddress = useWalletHubStore((state) => state.activeAddress);
  const preferredDefaultAddress = useWalletHubStore((state) => state.preferredDefaultAddress);
  const switchActiveAddress = useWalletHubStore((state) => state.switchActiveAddress);
  const setPreferredDefaultAddress = useWalletHubStore((state) => state.setPreferredDefaultAddress);
  const addTrackedWallet = useWalletHubStore((state) => state.addTrackedWallet);
  const removeTrackedWallet = useWalletHubStore((state) => state.removeTrackedWallet);
  const renameTrackedWallet = useWalletHubStore((state) => state.renameTrackedWallet);
  const reconcileActiveAddress = useWalletHubStore((state) => state.reconcileActiveAddress);

  // Only ever fetched once signed in (`enabled: hasSession`) — a guest's
  // watchlist never goes near react-query or the network at all.
  const {
    data: serverWallets,
    isError: watchlistIsError,
    refetch: refetchWatchlist,
  } = useWatchlist(hasSession);

  const trackedWallets = useMemo(() => {
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

  const allWallets = useMemo(() => {
    const list = [];
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

  // Safe fallback auto-resolver: runs post-commit, not as a render side effect.
  useEffect(() => {
    reconcileActiveAddress(allWallets);
  }, [allWallets, activeAddress, reconcileActiveAddress]);

  const activeWallet = allWallets.find((w) => w.address === activeAddress);
  // The connected wallet can perform authenticated actions (claim rewards,
  // sign transactions, later: save chat history). Tracked wallets are
  // read-only — viewing their data never implies the ability to act on it.
  const isActivePrimary = activeWallet?.type === "connected";

  return {
    trackedWallets,
    activeAddress,
    maxSlots,
    preferredDefaultAddress,
    switchActiveAddress,
    setPreferredDefaultAddress,
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
