import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useSearchParams } from "react-router";
import { ArrowPathIcon, WalletIcon, InboxIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useWalletActivity } from "@/hooks/queries/useWalletActivityQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import WalletActivitySkeleton from "@/pages/WalletActivity/components/WalletActivitySkeleton";
import KpiRow from "@/pages/WalletActivity/components/KpiRow";
import QuickInsights from "@/pages/WalletActivity/components/QuickInsights";
import ActivityCharts from "@/pages/WalletActivity/components/ActivityCharts";
import ActivityToolbar from "@/pages/WalletActivity/components/ActivityToolbar";
import ActivityFeed from "@/pages/WalletActivity/components/ActivityFeed";
import TransactionDrawer from "@/pages/WalletActivity/components/TransactionDrawer";
import {
  withActionIds,
  computeKpis,
  computeQuickInsights,
  computeDailyHistogram,
  computeAssetBreakdown,
  computeActionBreakdown,
  filterActivity,
  sortActivity,
  groupByDay,
  toCsv,
  toJson,
  downloadFile,
} from "@/pages/WalletActivity/utils/deriveActivity";
import type { DateRange, SortKey } from "@/pages/WalletActivity/utils/deriveActivity";

const TX_PARAM = "tx";

// Every derived view (KPIs, insights, both charts, filter/sort output,
// grouping) is computed from the *same* augmented history array via
// useMemo, each keyed on that array's reference plus whatever filter
// state it actually depends on — not recomputed from raw `history` in
// each child component. With 10,000+ rows, redoing these on every
// re-render (e.g. a drawer open/close, which doesn't change any of them)
// would be pure waste.
export default function WalletActivity() {
  const { t, i18n } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const { data, isSuccess, isError, isFetching, refetch } = useWalletActivity(activeAddress);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(() => new Set());
  const [selectedActions, setSelectedActions] = useState<Set<string>>(() => new Set());
  const [dateRange, setDateRange] = useState<DateRange>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const history = useMemo(() => (data?.history ? withActionIds(data.history) : []), [data]);

  const kpis = useMemo(
    () => (history.length ? computeKpis(history, data?.total_actions_indexed ?? 0) : null),
    [history, data?.total_actions_indexed],
  );
  const insights = useMemo(
    () => (history.length ? computeQuickInsights(history, { locale: i18n.language }) : null),
    [history, i18n.language],
  );
  const dailyHistogram = useMemo(() => computeDailyHistogram(history), [history]);
  const assetBreakdown = useMemo(() => computeAssetBreakdown(history), [history]);
  const actionBreakdown = useMemo(() => computeActionBreakdown(history), [history]);

  const availableAssets = useMemo(() => assetBreakdown.map((a) => a.asset), [assetBreakdown]);
  const availableActions = useMemo(
    () => actionBreakdown.map((a) => ({ action: a.action, label: a.label })),
    [actionBreakdown],
  );

  const filteredSorted = useMemo(() => {
    const filtered = filterActivity(history, { search, assets: selectedAssets, actions: selectedActions, dateRange });
    return sortActivity(filtered, selectedAssets.size === 1 ? sort : sort === "amount" ? "newest" : sort);
  }, [history, search, selectedAssets, selectedActions, dateRange, sort]);

  const groups = useMemo(
    () => groupByDay(filteredSorted, { locale: i18n.language }),
    [filteredSorted, i18n.language],
  );

  const selectedActionId = searchParams.get(TX_PARAM);
  const selectedIndex = filteredSorted.findIndex((item) => item.actionId === selectedActionId);
  const selectedItem = selectedIndex >= 0 ? filteredSorted[selectedIndex] : null;

  const openTransaction = (actionId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(TX_PARAM, actionId);
    setSearchParams(next, { replace: true });
  };
  const closeTransaction = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(TX_PARAM);
    setSearchParams(next, { replace: true });
  };
  const stepTransaction = (delta: number) => {
    const nextItem = filteredSorted[selectedIndex + delta];
    if (nextItem) openTransaction(nextItem.actionId);
  };

  const toggleInSet = (setState: Dispatch<SetStateAction<Set<string>>>) => (value: string) =>
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const handleExportCsv = () => downloadFile(toCsv(filteredSorted), "wallet-activity.csv", "text/csv");
  const handleExportJson = () => downloadFile(toJson(filteredSorted), "wallet-activity.json", "application/json");

  // The JSX below only ever reads `kpis` once `history.length` is truthy
  // (see the `!history.length` branch above) — exactly when the `kpis`
  // useMemo itself returns non-null. TS can't trace that correlation
  // through two separately-computed values, so this narrows it back;
  // unused (and therefore never unsafely dereferenced) otherwise.
  const activityKpis = kpis!;

  return (
    <div className="space-y-5 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.walletActivity")}
          description={t("wallet.activity.description")}
          rightContent={
            data && (
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                title={t("wallet.activity.refresh")}
                className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? t("dashboard.common.retrying") : t("wallet.activity.refresh")}
              </button>
            )
          }
        />
      </div>

      {!activeAddress ? (
        <WalletEmptyState
          icon={WalletIcon}
          title={t("dashboard.common.noWalletSelected")}
          description={t("wallet.activity.connectToSee")}
        />
      ) : isError ? (
        <div className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("wallet.activity.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : !isSuccess ? (
        // Deliberately `!isSuccess`, not `isLoading` — a paused (offline)
        // query has `isLoading: false` and `data: undefined`, which used to
        // fall through to `!history.length` below and claim the wallet has
        // zero activity. That's a materially different, misleading claim
        // from "we don't know yet" — this keeps showing the skeleton (which
        // self-clears once the query resolves) until we've actually heard
        // back one way or the other.
        <WalletActivitySkeleton />
      ) : !history.length ? (
        <WalletEmptyState
          icon={InboxIcon}
          title={t("wallet.activity.empty.title")}
          description={t("wallet.activity.empty.description")}
        />
      ) : (
        <>
          <KpiRow kpis={activityKpis} />
          <QuickInsights insights={insights} />
          <ActivityCharts
            dailyHistogram={dailyHistogram}
            assetBreakdown={assetBreakdown}
            actionBreakdown={actionBreakdown}
          />
          <ActivityToolbar
            search={search}
            onSearchChange={setSearch}
            availableAssets={availableAssets}
            selectedAssets={selectedAssets}
            onToggleAsset={toggleInSet(setSelectedAssets)}
            availableActions={availableActions}
            selectedActions={selectedActions}
            onToggleAction={toggleInSet(setSelectedActions)}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sort={sort}
            onSortChange={setSort}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
          />
          {filteredSorted.length === 0 ? (
            <WalletEmptyState
              icon={InboxIcon}
              title={t("wallet.activity.noResults.title")}
              description={t("wallet.activity.noResults.description")}
            />
          ) : (
            <ActivityFeed
              groups={groups}
              selectedActionId={selectedActionId}
              onSelect={openTransaction}
              totalCount={activityKpis.totalTransactions}
              shownCount={filteredSorted.length}
            />
          )}

          <TransactionDrawer
            item={selectedItem}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < filteredSorted.length - 1}
            onPrev={() => stepTransaction(-1)}
            onNext={() => stepTransaction(1)}
            onClose={closeTransaction}
          />
        </>
      )}
    </div>
  );
}
