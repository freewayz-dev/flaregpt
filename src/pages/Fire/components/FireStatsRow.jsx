import { useTranslation } from "react-i18next";
import { BanknotesIcon, Square3Stack3DIcon, FireIcon } from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import { useCurrency } from "@/hooks/useCurrency";

// Same horizontal-scroll-on-mobile / grid-on-desktop wrapper every other
// page's own stat row hand-rolls (RewardsOverviewStats, WalletActivity's
// KpiRow) — no shared generic StatRow component exists in this codebase to
// reuse instead.
export default function FireStatsRow({ overview }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const cards = [
    {
      title: t("fire.stats.totalTracked"),
      value: formatCurrency(overview.total_usd, { maximumFractionDigits: 0 }),
      icon: BanknotesIcon,
      emphasis: true,
    },
    {
      title: t("fire.stats.feeCategories"),
      value: overview.pools.length,
      icon: Square3Stack3DIcon,
    },
    {
      title: t("fire.stats.totalBurned"),
      value: formatCurrency(overview.total_burned_usd, { maximumFractionDigits: 0 }),
      icon: FireIcon,
    },
  ];

  return (
    // `overflow-y-hidden` alongside `overflow-x-auto` — without it, browsers
    // compute `overflow-y` as `auto` too, and an `InfoHint`'s always-mounted
    // (just invisible) popover panel makes that a real, scrollable vertical
    // overflow. See Fassets/components/FassetsStatsRow.jsx's own comment
    // for the full root-cause writeup — every stat row sharing this pattern
    // gets the same one-utility fix.
    <div className="flex gap-3 overflow-x-auto overflow-y-hidden touch-pan-x snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-none">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[150px] sm:min-w-0 snap-start">
          <StatCard {...card} />
        </div>
      ))}
    </div>
  );
}
