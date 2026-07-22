import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import { usePercentChange } from "@/hooks/usePercentChange";
import { useCurrency } from "@/hooks/useCurrency";

function formatPercent(value) {
  if (value == null) return undefined;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function StatRow({ marketOverview }) {
  const { formatCurrency } = useCurrency();

  const price = marketOverview?.market_metrics?.flr_spot_price_usd;
  const marketCap = marketOverview?.market_metrics?.market_cap_usd;
  const volume = marketOverview?.market_metrics?.volume_24h_usd;
  const tvl = marketOverview?.chain_infrastructure?.aggregate_tvl_usd;

  // Genuine deltas computed between consecutive live polls of this same
  // endpoint (refetched every 60s) — not fabricated percentages.
  const priceChange = usePercentChange(price);
  const tvlChange = usePercentChange(tvl);

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
