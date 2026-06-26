// src/context/WalletHubContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";

const WalletHubContext = createContext(null);

export function WalletHubProvider({ children }) {
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Load tracked monitoring targets from LocalStorage securely
  const [trackedWallets, setTrackedWallets] = useState(() => {
    const saved = localStorage.getItem("flaregpt_tracked_wallets");
    return saved ? JSON.parse(saved) : [];
  });

  // Load the globally focused active dashboard data context point
  const [activeAddress, setActiveAddress] = useState(() => {
    return localStorage.getItem("flaregpt_active_address") || "";
  });

  // Persistent background sync tracker updates
  useEffect(() => {
    localStorage.setItem("flaregpt_tracked_wallets", JSON.stringify(trackedWallets));
  }, [trackedWallets]);

  const switchActiveAddress = (addr) => {
    setActiveAddress(addr);
    localStorage.setItem("flaregpt_active_address", addr);
  };

  // Dynamically assemble combined structural index list
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

  // Safe fallback baseline auto-resolver framework loop execution
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
    
    const duplicateCheck = trackedWallets.some(w => w.address.toLowerCase() === address.toLowerCase()) || 
                     (isConnected && connectedAddress?.toLowerCase() === address.toLowerCase());
                     
    if (duplicateCheck) return false;
    
    setTrackedWallets([...trackedWallets, { address, label }]);
    return true;
  };

  const removeTrackedWallet = (addressToRemove) => {
    const updatedList = trackedWallets.filter(w => w.address !== addressToRemove);
    setTrackedWallets(updatedList);

    // Dynamic Context Cleanup: If user destroys active view node target, shift focus immediately
    if (activeAddress === addressToRemove) {
      if (isConnected && connectedAddress) {
        switchActiveAddress(connectedAddress);
      } else if (updatedList.length > 0) {
        switchActiveAddress(updatedList[0].address);
      } else {
        switchActiveAddress("");
      }
    }
  };

  return (
    <WalletHubContext.Provider value={{
      activeAddress,
      allWallets,
      trackedWallets,
      switchActiveAddress,
      addTrackedWallet,
      removeTrackedWallet,
      maxSlots: 5
    }}>
      {children}
    </WalletHubContext.Provider>
  );
}

export function useWalletHub() {
  const context = useContext(WalletHubContext);
  if (!context) {
    throw new Error("useWalletHub must be used within a WalletHubProvider");
  }
  return context;
}