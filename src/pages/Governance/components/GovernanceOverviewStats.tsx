import { useTranslation } from "react-i18next";
import { DocumentTextIcon, MegaphoneIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

import StatCard from "@/components/cards/StatCard";
import type { GovernanceStats } from "@/pages/Governance/utils/deriveGovernance";

interface GovernanceOverviewStatsProps {
  stats: GovernanceStats;
}

// Same horizontal-snap-scroll-on-mobile / grid-on-desktop shell as
// Dashboard's StatRow, FTSO Rewards' RewardsOverviewStats, etc. — every
// number here comes straight from real on-chain proposal states, counted
// client-side (deriveGovernance.ts's computeGovernanceStats), never a
// separate/duplicated statistic.
export default function GovernanceOverviewStats({ stats }: GovernanceOverviewStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-4 sm:overflow-visible scrollbar-none">
      <div className="w-40 shrink-0 snap-start sm:w-auto">
        <StatCard title={t("governance.stats.total")} value={stats.total} icon={DocumentTextIcon} />
      </div>
      <div className="w-40 shrink-0 snap-start sm:w-auto">
        <StatCard
          title={t("governance.stats.active")}
          value={stats.active}
          icon={MegaphoneIcon}
          emphasis={stats.active > 0}
        />
      </div>
      <div className="w-40 shrink-0 snap-start sm:w-auto">
        <StatCard title={t("governance.stats.passed")} value={stats.passed} icon={CheckCircleIcon} />
      </div>
      <div className="w-40 shrink-0 snap-start sm:w-auto">
        <StatCard title={t("governance.stats.defeated")} value={stats.defeated} icon={XCircleIcon} />
      </div>
    </div>
  );
}
