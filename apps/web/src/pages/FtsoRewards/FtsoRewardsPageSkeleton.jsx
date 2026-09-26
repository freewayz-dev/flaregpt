import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import FtsoRewardsSkeleton from "@/pages/FtsoRewards/components/skeletons/FtsoRewardsSkeleton";
import RankingTablesSectionSkeleton from "@/pages/FtsoRewards/components/RankingTablesSectionSkeleton";

// Route-level Suspense fallback while the FtsoRewards chunk itself loads —
// same reasoning as RflrVestingPageSkeleton: a page-shaped fallback here
// means the route never flashes the generic GlobalSpinner before settling
// into its own skeleton. RankingTablesSectionSkeleton (not the real,
// data-fetching RankingTablesSection — see its own comment for why) keeps
// this fallback's network cost at zero while still matching the real
// page's mobile-tabs/desktop-grid layout at this breakpoint.
export default function FtsoRewardsPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.ftsoRewards")} description={t("ftsoRewards.description")} />
      </div>

      <FtsoRewardsSkeleton />

      <RankingTablesSectionSkeleton />
    </div>
  );
}
