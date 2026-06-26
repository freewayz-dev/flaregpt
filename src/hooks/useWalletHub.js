// src/hooks/useWalletHub.js
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export function useWalletHub() {
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Load tracked wallets from LocalStorage
  const [trackedWallets, setTrackedWallets] = useState(() => {
    const saved = localStorage.getItem("flaregpt_tracked_wallets");
    return saved ? JSON.parse(saved) : [];
  });

  // Load the globally active dashboard address selection
  const [activeAddress, setActiveAddress] = useState(() => {
    return localStorage.getItem("flaregpt_active_address") || "";
  });

  // Sync tracked list changes to localStorage
  useEffect(() => {
    localStorage.setItem("flaregpt_tracked_wallets", JSON.stringify(trackedWallets));
  }, [trackedWallets]);

  // Handle active focus configuration alterations 
  const switchActiveAddress = (addr) => {
    setActiveAddress(addr);
    localStorage.setItem("flaregpt_active_address", addr);
  };

  // Compile combined collection
  const allWallets = [];
  if (isConnected && connectedAddress) {
    allWallets.push({
      address: connectedAddress,
      label: "Primary Wallet",
      type: "connected"
    });
  }
  trackedWallets.forEach((w) => {
    allWallets.push({
      address: w.address,
      label: w.label || "Watchlist Account",
      type: "tracked"
    });
  });

  // Keep a safe baseline active focus context mapping fallback
  useEffect(() => {
    const isStillAvailable = allWallets.some(w => w.address === activeAddress);
    if (!isStillAvailable || !activeAddress) {
      if (allWallets.length > 0) {
        switchActiveAddress(allWallets[0].address);
      } else {
        switchActiveAddress("");
      }
    }
  }, [connectedAddress, isConnected, trackedWallets, activeAddress]);

  const addTrackedWallet = (address, label) => {
    if (trackedWallets.length >= 5) return false;
    if (trackedWallets.some(w => w.address.toLowerCase() === address.toLowerCase()) || (isConnected && connectedAddress?.toLowerCase() === address.toLowerCase())) return false;
    
    setTrackedWallets([...trackedWallets, { address, label }]);
    return true;
  };

  const removeTrackedWallet = (address) => {
    setTrackedWallets(trackedWallets.filter(w => w.address !== address));
  };

  return {
    activeAddress,
    allWallets,
    trackedWallets,
    switchActiveAddress,
    addTrackedWallet,
    removeTrackedWallet,
    maxSlots: 5
  };
}