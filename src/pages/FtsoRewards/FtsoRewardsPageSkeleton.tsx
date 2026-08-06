import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import FtsoRewardsSkeleton from "@/pages/FtsoRewards/components/skeletons/FtsoRewardsSkeleton";
import ComingSoonTablesSection from "@/pages/FtsoRewards/components/ComingSoonTablesSection";

// Route-level Suspense fallback while the FtsoRewards chunk itself loads —
// same reasoning as RflrVestingPageSkeleton: a page-shaped fallback here
// means the route never flashes the generic GlobalSpinner before settling
// into its own skeleton. ComingSoonTablesSection is included as-is (not
// skeleton-shaped) since it renders the same way regardless of query
// state — nothing about it is actually loading — and reusing the same
// component here (rather than duplicating its mobile-tabs/desktop-grid
// split) keeps the fallback and the real page from ever disagreeing on
// layout at this breakpoint.
export default function FtsoRewardsPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.ftsoRewards")} description={t("ftsoRewards.description")} />
      </div>

      <FtsoRewardsSkeleton />

      <ComingSoonTablesSection />
    </div>
  );
}
