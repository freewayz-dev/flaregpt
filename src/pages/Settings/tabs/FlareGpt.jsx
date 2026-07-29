import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { CloudIcon, SparklesIcon } from "@heroicons/react/24/outline";

import { useAuthStatus } from "@/hooks/useAuthStatus";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

// Wallet *connection* and *authentication* are separate concepts app-wide
// (see useAuthStatus.js) — conversations only actually sync to an account
// once signed in, not merely connected, so this checks `hasSession`, not
// `isConnected`. Sign-in required in the first place (`Connect Wallet`
// only) would misrepresent a connected-but-signed-out visitor as already
// synced when their conversations are, in fact, exactly as ephemeral as a
// guest's.
//
// This used to also carry a "Default Wallet for FlareGPT" selector, but
// that duplicated WalletContextPill — the chip above the FlareGPT composer
// already offers the identical Primary/Watchlist switch, in the place a
// user is actually thinking about it, with the full wallet list visible. A
// second, out-of-context copy of the same control here added nothing but
// a chance for the two to feel inconsistent.
export default function FlareGpt() {
  const { t } = useTranslation();
  const { hasSession, isConnected, isCurrentWalletSignedIn, isAuthenticating, signIn } = useAuthStatus();
  const { openWalletModal } = useOutletContext();

  const handleSignInPrompt = () => {
    if (!isConnected) {
      openWalletModal();
    } else if (!isCurrentWalletSignedIn) {
      signIn();
    }
  };

  return (
    <div className="space-y-6">
      <Card title={t("settings.tabs.FlareGpt")} subtitle={t("settings.subtitles.FlareGpt")}>
        <div className="divide-y divide-divider">
          <RowItem
            icon={hasSession ? CloudIcon : SparklesIcon}
            title={t("settings.flareGpt.syncStatusTitle")}
            description={
              hasSession
                ? t("settings.flareGpt.syncStatusConnected")
                : t("settings.flareGpt.syncStatusGuest")
            }
          >
            {!hasSession && (
              <button
                type="button"
                onClick={handleSignInPrompt}
                disabled={isAuthenticating}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {!isConnected
                  ? t("sidebar.connectWallet")
                  : isAuthenticating
                    ? t("navbar.signingIn")
                    : t("navbar.signIn")}
              </button>
            )}
          </RowItem>
        </div>
      </Card>
    </div>
  );
}
