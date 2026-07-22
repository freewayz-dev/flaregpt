import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import { usePercentChange } from "@/hooks/usePercentChange";
import { useCurrency } from "@/hooks/useCurrency";
import { useMarketOverview } from "@/hooks/queries/useDashboardQueries";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";

function formatPercent(value) {
  if (value == null) return undefined;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Fetches its own data (rather than receiving it as a prop from Dashboard)
// so a slow or failing market-overview request only ever affects these 4
// cards — never blocks PageHeader, the charts, or the wallet cards below,
// which all gate on entirely different queries.
export default function StatRow() {
  const { formatCurrency } = useCurrency();
  const {
    data: marketOverview,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useMarketOverview();

  const price = marketOverview?.market_metrics?.flr_spot_price_usd;
  const marketCap = marketOverview?.market_metrics?.market_cap_usd;
  const volume = marketOverview?.market_metrics?.volume_24h_usd;
  const tvl = marketOverview?.chain_infrastructure?.aggregate_tvl_usd;

  // Genuine deltas computed between consecutive live polls of this same
  // endpoint (refetched every 60s) — not fabricated percentages. Called
  // unconditionally, before the loading/error early returns below, since
  // hooks must run in the same order on every render.
  const priceChange = usePercentChange(price);
  const tvlChange = usePercentChange(tvl);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-surface-card p-6 text-center shadow-sm border border-[#E5E7EB] dark:border-none">
        <p className="text-sm font-medium text-ink-primary">
          Couldn't load market overview
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
    );
  }

  const formatCompact = (value) =>
    formatCurrency(value, { notation: "compact", maximumFractionDigits: 2 });

  const cards = [
    {
      title: "FLR Price",
      value: formatCurrency(price, { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      change: formatPercent(priceChange),
      icon: CurrencyDollarIcon,
      live: true,
    },
    {
      title: "Market Cap",
      value: formatCompact(marketCap),
      icon: ChartBarIcon,
    },
    {
      title: "24h Volume",
      value: formatCompact(volume),
      icon: ArrowsRightLeftIcon,
    },
    {
      title: "TVL",
      value: formatCompact(tvl),
      change: formatPercent(tvlChange),
      icon: BanknotesIcon,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible scrollbar-none">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[150px] sm:min-w-0 snap-start">
          <StatCard {...card} />
        </div>
      ))}
    </div>
  );
}
