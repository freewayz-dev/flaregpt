import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import ApiStatusBadge from "@/pages/Dashboard/components/ApiStatusBadge";
import StatRow from "@/pages/Dashboard/components/StatRow";
import FlrPriceChart from "@/pages/Dashboard/components/FlrPriceChart";
import NetworkActivityChart from "@/pages/Dashboard/components/NetworkActivityChart";
import WalletBalancesCard from "@/pages/Dashboard/components/WalletBalancesCard";
import FtsoPortfolioCard from "@/pages/Dashboard/components/FtsoPortfolioCard";
import ClaimsAndDelegationsSection from "@/pages/Dashboard/components/ClaimsAndDelegationsSection";

// Deliberately does not fetch or gate on any query itself. Every section
// below (StatRow, FlrPriceChart, NetworkActivityChart, the wallet cards,
// Claims/Delegations) fetches and gates its own data independently, so a
// single slow or failing request only ever affects its own card — never the
// rest of the page. Previously this component blocked the entire page
// behind useGasPrice/useMarketOverview specifically, which meant a hiccup on
// either of those two endpoints hid PageHeader, the charts, and every other
// card that had nothing to do with them. DashboardSkeleton still exists as
// the route-level Suspense fallback for the lazy-loaded chunk itself (see
// AppRoutes.jsx) — that's a different, legitimate use of a full-page
// skeleton (the JS hasn't downloaded yet, not "a request is slow").
export default function Dashboard() {
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

      <StatRow />

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
