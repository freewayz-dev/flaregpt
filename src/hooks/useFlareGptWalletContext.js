import { useConnection } from "wagmi";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFlareGptStore } from "@/store/useFlareGptStore";

// Resolves which wallet FlareGPT should treat as its subject, mirroring
// the shape of the upcoming Profile endpoint's `settings.flareGpt`
// (`{walletMode: "primary" | "specific", walletAddress: string | null}`)
// — see useFlareGptStore.js for why. "primary" always resolves to
// whichever wallet is actually connected *right now* (matching that
// endpoint's own definition: "use the authenticated user's primary
// wallet"), not the dashboard's own active-viewing wallet — the rest of
// the dashboard can be showing a watchlist wallet's data while FlareGPT's
// own context stays independently pinned to Primary or a Specific
// watchlist pick. "specific" resolves to `walletAddress` for as long as
// that address still exists in `allWallets`; if it's ever removed from
// the watchlist, this quietly falls back to Primary rather than pointing
// at nothing; the stored preference itself is left untouched; the user
// would need to explicitly pick a mode to change it.
export function useFlareGptWalletContext() {
  const { address: connectedAddress, isConnected } = useConnection();
  const { allWallets, maxSlots } = useDerivedWalletHub(connectedAddress, isConnected);

  const walletMode = useFlareGptStore((s) => s.flareGptWalletMode);
  const walletAddress = useFlareGptStore((s) => s.flareGptWalletAddress);
  const setFlareGptWalletContext = useFlareGptStore((s) => s.setFlareGptWalletContext);

  const specificWalletStillExists =
    walletMode === "specific" && walletAddress
      ? allWallets.some((w) => w.address === walletAddress)
      : false;

  const effectiveAddress = specificWalletStillExists
    ? walletAddress
    : isConnected
      ? connectedAddress
      : null;

  const effectiveWallet = effectiveAddress
    ? (allWallets.find((w) => w.address === effectiveAddress) ?? null)
    : null;

  return {
    allWallets,
    effectiveAddress,
    effectiveWallet,
    walletMode,
    walletAddress,
    setFlareGptWalletContext,
    maxSlots,
  };
}
