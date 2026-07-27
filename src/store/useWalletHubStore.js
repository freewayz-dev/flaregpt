// src/store/useWalletHubStore.js
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWalletHubStore = create()(
  persist(
    (set, get) => ({
      trackedWallets: [],
      activeAddress: "",
      maxSlots: 5,
      // Distinct from `activeAddress` (whatever's active *right now*,
      // which sticks to however a session left off): this is an explicit,
      // user-pinned choice that only ever matters as the fallback below,
      // when there's no valid prior session to restore — first-ever
      // visit, or the previously-active wallet was removed. Switching
      // wallets mid-session never touches this value.
      preferredDefaultAddress: "",

      switchActiveAddress: (addr) => set({ activeAddress: addr }),
      setPreferredDefaultAddress: (addr) => set({ preferredDefaultAddress: addr }),

      addTrackedWallet: (address, label, connectedAddress, isConnected) => {
        const { trackedWallets, maxSlots } = get();
        if (trackedWallets.length >= maxSlots) return false;

        const isDuplicate =
          trackedWallets.some(w => w.address.toLowerCase() === address.toLowerCase()) ||
          (isConnected && connectedAddress?.toLowerCase() === address.toLowerCase());

        if (isDuplicate) return false;

        set({
          trackedWallets: [...trackedWallets, { address, label: label || "Watchlist Account" }]
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

// Derivation Helper Hook: Combines Wagmi live data with Zustand watchlist state
export function useDerivedWalletHub(connectedAddress, isConnected) {
  const trackedWallets = useWalletHubStore((state) => state.trackedWallets);
  const activeAddress = useWalletHubStore((state) => state.activeAddress);
  const maxSlots = useWalletHubStore((state) => state.maxSlots);
  const preferredDefaultAddress = useWalletHubStore((state) => state.preferredDefaultAddress);
  const switchActiveAddress = useWalletHubStore((state) => state.switchActiveAddress);
  const setPreferredDefaultAddress = useWalletHubStore((state) => state.setPreferredDefaultAddress);
  const addTrackedWallet = useWalletHubStore((state) => state.addTrackedWallet);
  const removeTrackedWallet = useWalletHubStore((state) => state.removeTrackedWallet);
  const renameTrackedWallet = useWalletHubStore((state) => state.renameTrackedWallet);
  const reconcileActiveAddress = useWalletHubStore((state) => state.reconcileActiveAddress);

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
  };
}