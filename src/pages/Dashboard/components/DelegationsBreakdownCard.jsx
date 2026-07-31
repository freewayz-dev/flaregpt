import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { Square3Stack3DIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import TableCardSkeleton from "@/pages/Dashboard/components/skeletons/TableCardSkeleton";

export default function DelegationsBreakdownCard() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const { data, isLoading, isError, isFetching, refetch } =
    useFtsoPortfolio(activeAddress);

  if (activeAddress && !isError && (isLoading || !data?.active_delegations)) {
    return <TableCardSkeleton />;
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary mb-4">
        {t("dashboard.delegationsBreakdown.title")}
      </h3>

      {!activeAddress ? (
        <WalletEmptyState
          icon={Square3Stack3DIcon}
          title={t("dashboard.common.noWalletSelected")}
          description={t("dashboard.delegationsBreakdown.connectToSee")}
        />
      ) : isError ? (
        <div role="alert" className="py-6 text-center rounded-2xl bg-surface-inset px-4">
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.delegationsBreakdown.couldntLoad")}
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
        <GenericTable
          items={data.active_delegations}
          emptyIcon={Square3Stack3DIcon}
          emptyTitle={t("dashboard.delegationsBreakdown.emptyTitle")}
          emptyDescription={t("dashboard.delegationsBreakdown.emptyDescription")}
        />
      )}
    </div>
  );
}
