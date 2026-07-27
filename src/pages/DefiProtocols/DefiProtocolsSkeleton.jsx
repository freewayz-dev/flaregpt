import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";
import StrategyComparisonTableSkeleton from "@/pages/DefiProtocols/components/skeletons/StrategyComparisonTableSkeleton";
import ProtocolExplorerSkeleton from "@/pages/DefiProtocols/components/skeletons/ProtocolExplorerSkeleton";

// Route-level Suspense fallback while the DefiProtocols chunk loads, built
// from the same per-section skeletons each section uses for its own loading
// state — matches the DashboardSkeleton precedent.
export default function DefiProtocolsSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.defiProtocols")}
          description={t("defiProtocols.description")}
        />
      </div>

      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} compact />
        ))}
      </div>

      <StrategyComparisonTableSkeleton />
      <ProtocolExplorerSkeleton />
    </div>
  );
}
