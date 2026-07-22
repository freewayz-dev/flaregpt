import { useTranslation } from "react-i18next";

import { useGasPrice, useMarketOverview } from "@/hooks/queries/useDashboardQueries";
import PageHeader from "@/components/common/PageHeader";
import DashboardSkeleton from "@/pages/Dashboard/DashboardSkeleton";
import ApiStatusBadge from "@/pages/Dashboard/components/ApiStatusBadge";
import StatRow from "@/pages/Dashboard/components/StatRow";
import FlrPriceChart from "@/pages/Dashboard/components/FlrPriceChart";
import NetworkActivityChart from "@/pages/Dashboard/components/NetworkActivityChart";
import WalletBalancesCard from "@/pages/Dashboard/components/WalletBalancesCard";
import FtsoPortfolioCard from "@/pages/Dashboard/components/FtsoPortfolioCard";
import ClaimsAndDelegationsSection from "@/pages/Dashboard/components/ClaimsAndDelegationsSection";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: gasPrice, isLoading: gasLoading } = useGasPrice();
  const { data: marketOverview, isLoading: marketLoading } = useMarketOverview();

  // Gate the whole page behind the core, always-fetched data (not the
  // wallet-specific cards, which manage their own state since they depend
  // on whether a wallet is connected). Rendering the identical skeleton here
  // and as the route's Suspense fallback means the user sees one continuous
  // loading state, not a spinner that gets swapped for a different skeleton.
  if (gasLoading || marketLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.overview")}
          description={t("dashboard.description")}
          rightContent={<ApiStatusBadge />}
        />
      </div>

      <StatRow marketOverview={marketOverview} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <FlrPriceChart />
        </div>
        <div className="min-w-0">
          <NetworkActivityChart />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WalletBalancesCard />
        <FtsoPortfolioCard />
      </div>

      <ClaimsAndDelegationsSection />
    </div>
  );
}
