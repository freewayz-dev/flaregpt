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

      switchActiveAddress: (addr) => set({ activeAddress: addr }),

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
        const { activeAddress } = get();
        const isStillAvailable = allWallets.some(w => w.address === activeAddress);
        if (isStillAvailable && activeAddress) return;

        const fallback = allWallets[0]?.address ?? "";
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
  const switchActiveAddress = useWalletHubStore((state) => state.switchActiveAddress);
  const addTrackedWallet = useWalletHubStore((state) => state.addTrackedWallet);
  const removeTrackedWallet = useWalletHubStore((state) => state.removeTrackedWallet);
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

  return {
    trackedWallets,
    activeAddress,
    maxSlots,
    switchActiveAddress,
    addTrackedWallet,
    removeTrackedWallet,
    allWallets,
    remainingSlots: maxSlots - trackedWallets.length,
  };
}