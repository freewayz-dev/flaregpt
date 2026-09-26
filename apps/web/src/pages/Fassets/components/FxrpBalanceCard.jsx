import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useWalletBalances } from "@/hooks/queries/useDashboardQueries";
import SensitiveValue from "@/components/common/SensitiveValue";
import { formatAmount } from "@/utils/format";

// A quick-glance version of the same balance MyFxrpSection's own balance
// tile shows further down the page (same hook, same query — react-query
// dedupes both callers onto one shared cache entry, not a second fetch) —
// placed right after the stats row specifically so a visitor's own FXRP
// position is visible the instant the page loads, without scrolling past
// the flow card, trend chart, and agent table to reach MyFxrpSection at
// the bottom. That section stays exactly where it is and keeps its own
// full balance + activity — this is deliberately just the number, not a
// second copy of the wallet-gating chrome (empty state, connect prompt)
// that section already owns.
//
// No wallet active shows "0 FXRP" rather than a WalletEmptyState/connect
// prompt — a lightweight top-of-page summary card, not a second full gate
// on the same page. A genuine fetch *error* is kept distinct from that:
// showing "0" there would assert a real balance we don't actually know,
// the same fabricated-financial-metric mistake this page's own build
// notes elsewhere already guard against — so only the true "no wallet"
// case renders zero; an error renders the same muted "unavailable" copy
// MyFxrpSection's own balance tile already uses for it.
export default function FxrpBalanceCard() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const balancesQuery = useWalletBalances(activeAddress);

  const balance = balancesQuery.data?.balances?.FXRP;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{t("fassets.myFxrp.yourBalance")}</h3>
      {activeAddress && balancesQuery.isLoading ? (
        <div className="skeleton mt-2 h-8 w-40 rounded" />
      ) : activeAddress && balancesQuery.isError ? (
        <p className="mt-2 text-sm text-ink-muted">{t("fassets.myFxrp.balanceUnavailable")}</p>
      ) : (
        <p className="mt-2 text-2xl font-bold tabular-nums text-ink-primary">
          <SensitiveValue>{formatAmount(balance ?? 0)}</SensitiveValue> FXRP
        </p>
      )}
    </div>
  );
}
