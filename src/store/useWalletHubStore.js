// src/store/useWalletHubStore.js
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
    }),
    {
      name: "flaregpt_wallet_hub",
    }
  )
);

// Derivation Helper Hook: Combines Wagmi live data with Zustand watchlist state 
export function useDerivedWalletHub(connectedAddress, isConnected) {
  const store = useWalletHubStore();
  
  const allWallets = [];
  if (isConnected && connectedAddress) {
    allWallets.push({
      address: connectedAddress,
      label: "Primary Wallet",
      type: "connected"
    });
  }
  
  store.trackedWallets.forEach((w) => {
    allWallets.push({
      address: w.address,
      label: w.label,
      type: "tracked"
    });
  });

  // Safe fallback auto-resolver loop execution on state updates
  const isStillAvailable = allWallets.some(w => w.address === store.activeAddress);
  if (!isStillAvailable || !store.activeAddress) {
    if (allWallets.length > 0) {
      store.switchActiveAddress(allWallets[0].address);
    } else if (store.activeAddress !== "") {
      store.switchActiveAddress("");
    }
  }

  return {
    ...store,
    allWallets,
    remainingSlots: store.maxSlots - store.trackedWallets.length
  };
}