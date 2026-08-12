import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useConnection } from "wagmi";
import { WalletIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useAddWalletModalStore } from "@/store/useAddWalletModalStore";
import { useUIStore } from "@/store/useUIStore";
import { ROUTES } from "@/config/routes";

// The one, single entry point for adding a watchlist wallet from Overview —
// deliberately mounted once, at the very top of the page (Dashboard/index.tsx,
// directly under PageHeader, before StatRow/the charts/every wallet-dependent
// card), not duplicated as a per-card action anymore. A first-time guest
// landing on Overview previously had to scroll past StatRow, both charts,
// and into the Wallet Balances card before finding any way to add a wallet
// at all — on a real mobile viewport that's a full screen or more of
// scrolling before the one thing a brand-new visitor actually needs is even
// visible. Putting it here means it's the second thing on the page, after
// the title, for every visitor, guest or signed-in, exactly the same way
// (both paths already flow through the same useDerivedWalletHub /
// AddWalletModal this app already uses — see AddWalletModal's own comment).
//
// Two states, not one: an empty-state visitor gets the actual prominent
// call-to-action; someone who already has a wallet active (connected OR
// tracked) gets a much quieter "Manage your wallets" pointer instead — the
// loud version has already done its job once a wallet exists, and leaving
// it at full volume forever would just be noise competing with the real
// dashboard content beneath it.
export default function WalletTrackingBanner() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const openAddWalletModal = useAddWalletModalStore((state) => state.open);
  const setSettingsActiveTab = useUIStore((state) => state.setSettingsActiveTab);

  if (activeAddress) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-surface-card px-4 py-3 sm:px-6 shadow-sm border border-[#E5E7EB] dark:border-none">
        <p className="text-xs text-ink-secondary">
          {t("dashboard.walletTracking.manageDescription")}
        </p>
        <Link
          to={ROUTES.settings}
          onClick={() => setSettingsActiveTab("Wallets")}
          className="shrink-0 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          {t("dashboard.common.manageWallets")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-brand/5 border border-brand/15 p-4 sm:p-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <WalletIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-primary">
            {t("dashboard.walletTracking.title")}
          </p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {t("dashboard.walletTracking.description")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={openAddWalletModal}
        className="shrink-0 w-full sm:w-auto rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(230,32,88,0.2)] transition-all cursor-pointer"
      >
        {t("dashboard.common.addWalletToTrack")}
      </button>
    </div>
  );
}
