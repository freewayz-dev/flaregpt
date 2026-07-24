import { useConnection } from "wagmi";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFlareGptStore } from "@/store/useFlareGptStore";

// Resolves which wallet FlareGPT should treat as its subject: the user's
// own explicit choice if they've made one this session (including having
// deliberately chosen "General"), otherwise whatever the dashboard's own
// active wallet is — so opening chat for the first time defaults to
// something sensible without forcing a choice, while a later explicit
// pick (e.g. "analyze my Trading Account instead") sticks even if the
// dashboard's own active wallet changes elsewhere.
export function useFlareGptWalletContext() {
  const { address: connectedAddress, isConnected } = useConnection();
  const { allWallets, activeAddress: dashboardActiveAddress } = useDerivedWalletHub(
    connectedAddress,
    isConnected,
  );

  const aiWalletAddress = useFlareGptStore((s) => s.aiWalletAddress);
  const setAiWalletAddress = useFlareGptStore((s) => s.setAiWalletAddress);

  const effectiveAddress =
    aiWalletAddress === undefined ? dashboardActiveAddress || null : aiWalletAddress;
  const effectiveWallet = effectiveAddress
    ? (allWallets.find((w) => w.address === effectiveAddress) ?? null)
    : null;

  return { allWallets, effectiveAddress, effectiveWallet, setAiWalletAddress };
}
