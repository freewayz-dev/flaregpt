import { useTranslation } from "react-i18next";
import { ArrowPathIcon, FireIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import { useFireOverview } from "@/hooks/queries/useFireQueries";
import FireSkeleton from "@/pages/Fire/components/FireSkeleton";
import FireStatsRow from "@/pages/Fire/components/FireStatsRow";
import FirePoolsTable from "@/pages/Fire/components/FirePoolsTable";

// Public, no-auth, no-wallet-gating page — modeled directly on
// Links/index.jsx (the closest existing precedent for a fully public page:
// PageHeader -> loading skeleton -> error+retry -> empty state -> content,
// no wallet-connect gate anywhere).
export default function Fire() {
  const { t } = useTranslation();
  const query = useFireOverview();
  const overview = query.data;

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.fire")} description={t("fire.description")} />
      </div>

      {query.isLoading ? (
        <FireSkeleton />
      ) : query.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("fire.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            {query.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : !overview?.pools?.length ? (
        <WalletEmptyState
          icon={FireIcon}
          title={t("fire.empty.title")}
          description={t("fire.empty.description")}
        />
      ) : (
        <>
          <FireStatsRow overview={overview} />

          {/* The API's own `note` field is a live, self-updating caveat
              (which fee categories are/aren't covered, how "burned" is
              computed) — always rendered near the total rather than
              assumed static copy, so it stays accurate if the backend adds
              more pools later without a frontend change. */}
          {overview.note && (
            <p className="text-[11px] text-ink-muted max-w-2xl">{overview.note}</p>
          )}

          <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
            <h3 className="text-sm font-semibold text-ink-primary">{t("fire.table.title")}</h3>
            <div className="mt-4">
              <FirePoolsTable pools={overview.pools} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
