import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useOutletContext } from "react-router-dom";
import { CloudIcon, SparklesIcon } from "@heroicons/react/24/outline";

import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

// Wallet connection doubles as sign-in app-wide (useAuthSync) — this
// status row is the honest, present-tense version of that: what actually
// happens *today* is that every conversation lives in this browser's
// local storage regardless of connection state (there's no backend to
// sync to yet). It says so plainly rather than claiming an already-synced
// state a connected user doesn't actually have — the future-tense
// "will sync" framing is what's true; overclaiming it as already
// happening would be exactly the kind of faked-ahead-of-the-backend
// behavior this section is meant to avoid.
//
// This used to also carry a "Default Wallet for FlareGPT" selector, but
// that duplicated WalletContextPill — the chip above the FlareGPT composer
// already offers the identical Primary/Watchlist/General switch, in the
// place a user is actually thinking about it, with the full wallet list
// visible. A second, out-of-context copy of the same control here added
// nothing but a chance for the two to feel inconsistent.
export default function FlareGpt() {
  const { t } = useTranslation();
  const { isConnected } = useConnection();
  const { openWalletModal } = useOutletContext();

  return (
    <div className="space-y-6">
      <Card title={t("settings.tabs.FlareGpt")} subtitle={t("settings.subtitles.FlareGpt")}>
        <div className="divide-y divide-divider">
          <RowItem
            icon={isConnected ? CloudIcon : SparklesIcon}
            title={t("settings.flareGpt.syncStatusTitle")}
            description={
              isConnected
                ? t("settings.flareGpt.syncStatusConnected")
                : t("settings.flareGpt.syncStatusGuest")
            }
          >
            {!isConnected && (
              <button
                type="button"
                onClick={openWalletModal}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("sidebar.connectWallet")}
              </button>
            )}
          </RowItem>
        </div>
      </Card>
    </div>
  );
}
