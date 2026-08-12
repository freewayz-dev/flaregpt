import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import ApiStatusBadge from "@/pages/Dashboard/components/ApiStatusBadge";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";
import FlrPriceChartSkeleton from "@/pages/Dashboard/components/skeletons/FlrPriceChartSkeleton";
import NetworkActivityChartSkeleton from "@/pages/Dashboard/components/skeletons/NetworkActivityChartSkeleton";
import WalletBalancesCardSkeleton from "@/pages/Dashboard/components/skeletons/WalletBalancesCardSkeleton";
import FtsoPortfolioCardSkeleton from "@/pages/Dashboard/components/skeletons/FtsoPortfolioCardSkeleton";
import ClaimsAndDelegationsSkeleton from "@/pages/Dashboard/components/skeletons/ClaimsAndDelegationsSkeleton";

// Used both as the route-level Suspense fallback (while the Dashboard chunk
// loads) and as Dashboard's own "core data still loading" render, so the
// user sees one continuous loading state rather than a spinner that gets
// swapped for a different-looking skeleton. Assembled from the same
// per-card skeleton components each card uses for its own loading state, so
// dimensions match the real layout closely and there's minimal layout shift
// when content swaps in. The header renders for real since it doesn't
// depend on any not-yet-loaded data.
export default function DashboardSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.overview")}
          description={t("dashboard.description")}
          rightContent={<ApiStatusBadge />}
        />
      </div>

      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <FlrPriceChartSkeleton />
        </div>
        <div className="min-w-0">
          <NetworkActivityChartSkeleton />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WalletBalancesCardSkeleton />
        <FtsoPortfolioCardSkeleton />
      </div>

      <ClaimsAndDelegationsSkeleton />
    </div>
  );
}
