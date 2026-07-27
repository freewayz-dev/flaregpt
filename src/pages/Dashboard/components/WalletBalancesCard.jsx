import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { WalletIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useWalletBalances } from "@/hooks/queries/useDashboardQueries";
import TokenIcon from "@/components/common/TokenIcon";
import SensitiveValue from "@/components/common/SensitiveValue";
import WalletBalancesCardSkeleton from "@/pages/Dashboard/components/skeletons/WalletBalancesCardSkeleton";

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function WalletBalancesCard() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const { data, isLoading, isError, isFetching, refetch } =
    useWalletBalances(activeAddress);

  if (activeAddress && (isLoading || (!data?.balances && !isError))) {
    return <WalletBalancesCardSkeleton />;
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary mb-4">
        {t("dashboard.walletBalances.title")}
      </h3>

      {!activeAddress ? (
        <div className="py-8 text-center rounded-2xl bg-surface-inset px-4">
          <WalletIcon className="h-8 w-8 mx-auto text-ink-muted mb-2" />
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.common.noWalletSelected")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.walletBalances.connectToSeeBalances")}
          </p>
        </div>
      ) : isError ? (
        <div className="py-6 text-center rounded-2xl bg-surface-inset px-4">
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.walletBalances.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.common.networkHiccup")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(data.balances).map(([symbol, amount]) => (
            <div key={symbol} className="rounded-xl bg-surface-inset p-3">
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <TokenIcon symbol={symbol} size={14} />
                {symbol}
              </p>
              <p className="mt-1 text-lg font-semibold text-ink-primary truncate">
                <SensitiveValue>{formatAmount(amount)}</SensitiveValue>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
