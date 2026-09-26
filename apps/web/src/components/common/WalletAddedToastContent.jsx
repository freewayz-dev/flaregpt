import { useTranslation } from "react-i18next";



// The one shared success-toast body for adding a watchlist wallet — same
// two-line title+detail shape UpdateToastContent already established for
// this app's other non-trivial toast, so this doesn't invent a second
// toast "voice." Used by both Settings > Wallets and Overview's
// AddWalletModal — see each call site's own comment for why a toast is
// required there rather than relying on the wallet simply appearing in a
// list as the only confirmation.
export function WalletAddedToastContent({ label, becameActive }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-semibold text-ink-primary">
        {t("dashboard.addWallet.toastTitle")}
      </p>
      <p className="mt-0.5 text-xs text-ink-secondary">
        {becameActive
          ? t("dashboard.addWallet.toastBodyActive", { label })
          : t("dashboard.addWallet.toastBody", { label })}
      </p>
    </div>
  );
}
