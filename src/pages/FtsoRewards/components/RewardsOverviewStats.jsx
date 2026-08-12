import { useTranslation } from "react-i18next";
import {
  BanknotesIcon,
  GiftIcon,
  BoltIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import SensitiveValue from "@/components/common/SensitiveValue";
import { formatFlr } from "@/utils/format";




// Presentational only — receives the already-derived summary (see
// utils/deriveFtsoRewards.ts), same split as rFLR's VestingOverviewStats.
export default function RewardsOverviewStats({ summary }) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("ftsoRewards.stats.wflrBalance"),
      value: <SensitiveValue>{formatFlr(summary.wflrBalance)}</SensitiveValue>,
      icon: BanknotesIcon,
    },
    {
      title: t("ftsoRewards.stats.unclaimed"),
      value: <SensitiveValue>{formatFlr(summary.unclaimed)}</SensitiveValue>,
      icon: GiftIcon,
      emphasis: true,
    },
    {
      title: t("ftsoRewards.stats.hourlyEarning"),
      value: <SensitiveValue>{formatFlr(summary.hourlyEarning)}</SensitiveValue>,
      icon: BoltIcon,
    },
    {
      title: t("ftsoRewards.stats.targetEpochYield"),
      value: <SensitiveValue>{formatFlr(summary.targetEpochYield)}</SensitiveValue>,
      icon: ChartBarIcon,
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
