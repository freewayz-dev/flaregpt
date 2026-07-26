import { useTranslation } from "react-i18next";
import {
  ListBulletIcon,
  Square3Stack3DIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";

// Reuses StatCard/StatRow's exact layout from the Overview page (R7:
// "honest KPI cards only") — four tiles, every one of them either a direct
// field from the API (`total_actions_indexed`) or a plain count/duration
// derived from it. Deliberately excludes anything like "Total Volume" or
// "Gas Fees Paid": summing raw `amount` across different assets with no
// USD conversion would be a fabricated-looking number, and the API has no
// fee field at all — see the approved design review.
export default function KpiRow({ kpis }) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("wallet.activity.kpi.totalTransactions"),
      value: kpis.totalTransactions.toLocaleString(),
      icon: ListBulletIcon,
    },
    {
      title: t("wallet.activity.kpi.uniqueAssets"),
      value: kpis.uniqueAssetCount.toLocaleString(),
      icon: Square3Stack3DIcon,
    },
    {
      title: t("wallet.activity.kpi.walletAge"),
      value: t(`wallet.activity.kpi.walletAge${capitalize(kpis.walletAge.unit)}`, {
        count: kpis.walletAge.count,
      }),
      icon: CalendarDaysIcon,
    },
    {
      title: t("wallet.activity.kpi.lastActive"),
      value: formatRelative(kpis.lastActiveTimestamp, t),
      icon: ClockIcon,
      emphasis: true,
    },
  ];

  // Matches StatRow's exact mobile pattern (Overview page): a snap-scroll
  // horizontal row below `sm`, a static grid at `sm` and up. Four full-
  // width stacked rows on a phone pushed the actual transaction feed
  // uncomfortably far down the page; one swipeable row gets there faster
  // and reads as consistent with the rest of the dashboard rather than as
  // this page's own layout.
  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-4 sm:overflow-visible scrollbar-none">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[150px] sm:min-w-0 snap-start">
          <StatCard {...card} compact />
        </div>
      ))}
    </div>
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRelative(timestampSeconds, t) {
  const diffMs = Date.now() - timestampSeconds * 1000;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return t("wallet.activity.kpi.justNow");
  if (diffMin < 60) return t("wallet.activity.kpi.minutesAgo", { count: diffMin });
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return t("wallet.activity.kpi.hoursAgo", { count: diffHours });
  const diffDays = Math.round(diffHours / 24);
  return t("wallet.activity.kpi.daysAgo", { count: diffDays });
}
