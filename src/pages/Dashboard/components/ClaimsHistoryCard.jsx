import { useAccount } from "wagmi";
import { ClockIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import TableCardSkeleton from "@/pages/Dashboard/components/skeletons/TableCardSkeleton";

export default function ClaimsHistoryCard() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const { data, isLoading, isError, isFetching, refetch } =
    useFtsoPortfolio(activeAddress);

  if (activeAddress && !isError && (isLoading || !data?.unclaimed_epochs_ledger)) {
    return <TableCardSkeleton />;
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary mb-4">
        Claims History
      </h3>

      {!activeAddress ? (
        <WalletEmptyState
          icon={ClockIcon}
          title="No wallet selected"
          description="Connect or add a wallet in Settings to see claim history."
        />
      ) : isError ? (
        <div className="py-6 text-center rounded-2xl bg-surface-inset px-4">
          <p className="text-sm font-medium text-ink-primary">
            Couldn't load claims history
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            This is usually a temporary network hiccup.
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
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : (
        <GenericTable
          items={data.unclaimed_epochs_ledger}
          emptyIcon={ClockIcon}
          emptyTitle="No unclaimed epochs"
          emptyDescription="You're all caught up — there are no pending reward epochs to claim."
        />
      )}
    </div>
  );
}
