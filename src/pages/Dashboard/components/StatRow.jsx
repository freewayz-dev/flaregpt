import { useTranslation } from "react-i18next";
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { useMarketOverview } from "@/hooks/queries/useDashboardQueries";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";

// Fetches its own data (rather than receiving it as a prop from Dashboard)
// so a slow or failing market-overview request only ever affects these 4
// cards — never blocks PageHeader, the charts, or the wallet cards below,
// which all gate on entirely different queries.
export default function StatRow() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const {
    data: marketOverview,
    isSuccess,
    isError,
    isFetching,
    refetch,
  } = useMarketOverview();

  const price = marketOverview?.market_metrics?.flr_spot_price_usd;
  const marketCap = marketOverview?.market_metrics?.market_cap_usd;
  const volume = marketOverview?.market_metrics?.volume_24h_usd;
  const tvl = marketOverview?.chain_infrastructure?.aggregate_tvl_usd;

  if (isError) {
    return (
      <div className="rounded-2xl bg-surface-card p-6 text-center shadow-sm border border-[#E5E7EB] dark:border-none">
        <p className="text-sm font-medium text-ink-primary">
          {t("dashboard.stats.couldntLoad")}
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
    );
  }

  // Deliberately `!isSuccess`, not `isLoading` — a query paused offline (or
  // one whose data just hasn't landed yet, disabled query, etc.) has both
  // `isLoading` and `isError` false with `data` still undefined. Falling
  // through to the cards below in that state would render every metric as
  // "undefined" with no error shown at all. Gating on `isSuccess` treats
  // every not-yet-resolved state as "still loading" and self-heals the
  // instant the query actually resolves, instead of needing a manual retry.
  if (!isSuccess) {
    return (
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const formatCompact = (value) =>
    formatCurrency(value, { notation: "compact", maximumFractionDigits: 2 });

  // No card here shows a percent change: the API only ever returns a
  // current spot value, never a historical baseline to compare against, so
  // there's no real change to compute. An earlier version derived one from
  // the delta between two consecutive 60s polls — but for a value that
  // barely moves minute-to-minute, that's just measuring API rounding noise,
  // not real price movement, and it routinely disagreed with FlrPriceChart's
  // genuine timeframe-based change (which compares two points days apart).
  // "Live" on the price card means what it says: this is the current spot
  // value, refreshed every 60s — not "up/down since a moment ago".
  const cards = [
    {
      title: t("dashboard.stats.flrPrice"),
      value: formatCurrency(price, { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
      icon: CurrencyDollarIcon,
      live: true,
    },
    {
      title: t("dashboard.stats.marketCap"),
      value: formatCompact(marketCap),
      icon: ChartBarIcon,
    },
    {
      title: t("dashboard.stats.volume24h"),
      value: formatCompact(volume),
      icon: ArrowsRightLeftIcon,
    },
    {
      title: t("dashboard.stats.tvl"),
      value: formatCompact(tvl),
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
