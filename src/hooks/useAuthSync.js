import { useEffect } from "react";
import { useAccount } from "wagmi";

import { useAuthStore } from "@/store/useAuthStore";

// Connecting a wallet doubles as signing in — this is the only place that
// watches wagmi's connection state, so wiring a real authentication API
// later (e.g. sign-a-message-then-verify) only requires changing
// services/authService.js, not any component that reads useAuthStore.
export function useAuthSync() {
  const { address, isConnected } = useAccount();
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const authAddress = useAuthStore((state) => state.address);

  useEffect(() => {
    if (isConnected && address) {
      signIn(address);
    } else if (!isConnected && authAddress) {
      signOut();
    }
  }, [isConnected, address, authAddress, signIn, signOut]);
}
