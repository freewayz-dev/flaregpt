import { useConnection, useSignMessage } from "wagmi";

import { useAuthStore } from "@/store/useAuthStore";
import { signIn as triggerSignIn } from "@/hooks/useAuthSync";

// Single shared place Navbar and Sidebar both read from, so they can never
// disagree about when to show "Sign In" vs. the connected wallet itself —
// each of them calling useSignMessage() independently is fine, wagmi's
// mutation hooks don't need to be the same instance to drive the same
// underlying wallet.
export function useAuthStatus() {
  const { address, isConnected } = useConnection();
  const { mutateAsync: signMessageAsync } = useSignMessage();

  const token = useAuthStore((state) => state.token);
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);

  // Has a valid session at all, regardless of what's connected right now
  // (or whether anything is) — this is what "still signed in after
  // disconnect" means, and the only thing that should gate whether
  // Logout has anything to do.
  const hasSession = Boolean(token);

  // The wallet actively connected right now specifically matches that
  // session — false while disconnected, and false the moment a
  // *different* wallet connects, even though `hasSession` stays true.
  const isCurrentWalletSignedIn = Boolean(
    hasSession &&
      isConnected &&
      address &&
      authenticatedAddress?.toLowerCase() === address.toLowerCase(),
  );

  const signIn = () => {
    if (!isConnected || !address) return;
    return triggerSignIn(address, signMessageAsync);
  };

  return {
    isConnected,
    hasSession,
    isCurrentWalletSignedIn,
    isAuthenticating,
    signIn,
  };
}
