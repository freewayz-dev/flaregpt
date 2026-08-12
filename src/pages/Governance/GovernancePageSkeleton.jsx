import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";
import ActiveProposalsSkeleton from "@/pages/Governance/components/skeletons/ActiveProposalsSkeleton";
import GovernanceHistorySkeleton from "@/pages/Governance/components/skeletons/GovernanceHistorySkeleton";

// Route-level Suspense fallback while the Governance chunk itself loads —
// built from the same section skeletons the page shows once mounted, same
// convention as RflrVestingPageSkeleton/FtsoRewardsPageSkeleton, so there's
// no visible seam between "chunk loading" and "on-chain data loading".
export default function GovernancePageSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.governance")} description={t("governance.description")} />
      </div>

      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <ActiveProposalsSkeleton />
      <GovernanceHistorySkeleton />
    </div>
  );
}
