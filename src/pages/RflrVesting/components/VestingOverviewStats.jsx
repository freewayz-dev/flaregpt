import { useTranslation } from "react-i18next";
import {
  BanknotesIcon,
  LockOpenIcon,
  LockClosedIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import SensitiveValue from "@/components/common/SensitiveValue";
import { formatFlr } from "@/utils/format";




// Presentational only — receives the already-derived summary (see
// utils/deriveVesting.ts) rather than fetching or computing anything
// itself, matching WalletActivity's KpiRow/KPI split (page-level gate +
// derive, dumb card below).
export default function VestingOverviewStats({ summary }) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("rflrVesting.stats.totalBalance"),
      value: <SensitiveValue>{formatFlr(summary.total)}</SensitiveValue>,
      icon: BanknotesIcon,
    },
    {
      title: t("rflrVesting.stats.liquidNow"),
      value: <SensitiveValue>{formatFlr(summary.liquid)}</SensitiveValue>,
      icon: LockOpenIcon,
      emphasis: true,
    },
    {
      title: t("rflrVesting.stats.lockedInVesting"),
      value: <SensitiveValue>{formatFlr(summary.locked)}</SensitiveValue>,
      icon: LockClosedIcon,
    },
    {
      title: t("rflrVesting.stats.vestedProgress"),
      value: `${summary.vestedPercent.toFixed(1)}%`,
      icon: ChartPieIcon,
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
