import { useTranslation } from "react-i18next";
import { ArrowPathIcon, FireIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import { useFireOverview, useFireOverviewV2 } from "@/hooks/queries/useFireQueries";
import { useCurrency } from "@/hooks/useCurrency";
import { computeDailyTrend } from "@/pages/Fire/utils/deriveFireOverview";
import FireSkeleton from "@/pages/Fire/components/FireSkeleton";
import FireStatsRow from "@/pages/Fire/components/FireStatsRow";
import FireFreshnessNote from "@/pages/Fire/components/FireFreshnessNote";
import FireBreakdownChart from "@/pages/Fire/components/FireBreakdownChart";
import FireTrendChart from "@/pages/Fire/components/FireTrendChart";
import FirePoolsTable from "@/pages/Fire/components/FirePoolsTable";

// Public, no-auth, no-wallet-gating page — modeled directly on
// Links/index.jsx (the closest existing precedent for a fully public page:
// PageHeader -> loading skeleton -> error+retry -> empty state -> content,
// no wallet-connect gate anywhere).
export default function Fire() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const query = useFireOverview();
  const overview = query.data;

  // Entirely independent of `query`/`overview` above — v1 keeps backing
  // everything else on this page unchanged. This only ever feeds
  // FireTrendChart below, and its own loading/error states never affect
  // anything else here: a slow or failed v2 fetch just means the trend
  // chart doesn't render, not a page-level error.
  const trendQuery = useFireOverviewV2();
  const trendSeries = computeDailyTrend(trendQuery.data?.daily_history);

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.fire")} description={t("fire.description")} />
        {/* Expands on the one-sentence PageHeader description above for
            anyone who hasn't read Flare's own FIP — collapsed by default
            (Disclosure's own established behavior everywhere else it's
            used) so it doesn't compete with the real numbers below for a
            returning visitor who already knows what FIRE is. */}
        <Disclosure label={t("fire.explainer.label")} align="start">
          <p className="text-xs text-ink-secondary max-w-2xl">{t("fire.explainer.body")}</p>
        </Disclosure>
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

          <div className="space-y-1">
            {/* The API's own `note` field is a live, self-updating caveat
                (which fee categories are/aren't covered, how "burned" is
                computed) — always rendered near the total rather than
                assumed static copy, so it stays accurate if the backend
                adds more pools later without a frontend change. */}
            {overview.note && (
              <p className="text-[11px] text-ink-muted max-w-2xl">{overview.note}</p>
            )}
            <FireFreshnessNote dataUpdatedAt={query.dataUpdatedAt} />
          </div>

          {/* PoolOwnershipBar reused as-is (see its own header comment) —
              a horizontal fill bar was deliberately chosen there over a
              donut specifically so it "stays visually calm at 0%" rather
              than reading as broken, which is exactly today's real state
              here: $0 burned from every pool so far. */}
          <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
            <PoolOwnershipBar
              label={t("fire.burnedProgress.label")}
              percentage={overview.total_usd ? (overview.total_burned_usd / overview.total_usd) * 100 : 0}
              valueLabel={t("fire.burnedProgress.valueLabel", {
                burned: formatCurrency(overview.total_burned_usd),
                total: formatCurrency(overview.total_usd),
              })}
            />
          </div>

          {/* Only worth a whole chart once there's more than one category
              to actually compare — a single bar communicates nothing a
              stat tile above didn't already say more plainly, same
              reasoning ActivityCharts.jsx already applies to its own
              action-breakdown chart. */}
          {/* v2-only addition, entirely separate from the v1-driven content
              elsewhere on this page — absent whenever v2 hasn't loaded yet,
              failed, or came back degraded with no daily_history (the
              "flaremetrics_partial" case per the v2 handoff), same as how
              FireBreakdownChart below simply isn't rendered rather than
              showing an empty/error chart. Placed before the category
              breakdown — "how it's moved over time" reads first, "how it
              splits right now" second. */}
          {trendSeries.length > 0 && <FireTrendChart series={trendSeries} />}

          {overview.pools.length > 1 && <FireBreakdownChart pools={overview.pools} />}

          <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
            <h3 className="text-sm font-semibold text-ink-primary">{t("fire.table.title")}</h3>
            <div className="mt-4">
              <FirePoolsTable pools={overview.pools} totalUsd={overview.total_usd} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
