import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import KpiSummaryRow from "@/pages/DefiProtocols/components/KpiSummaryRow";
import StrategyComparisonTable from "@/pages/DefiProtocols/components/StrategyComparisonTable";
import ProtocolExplorer from "@/pages/DefiProtocols/components/ProtocolExplorer";

// Deliberately does not fetch or gate on any query itself, mirroring
// Dashboard/index.jsx — the KPI row, strategy table, and protocol explorer
// each fetch and gate their own data independently. Spacing between
// sections is wider than Dashboard's (space-y-8 vs space-y-6) on purpose:
// this page trades a "dashboard of small cards" feel for three distinct,
// spacious sections (KPIs, a comparison table, a master-detail explorer)
// rather than a repeating wall of cards.
export default function DefiProtocols() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.defiProtocols")}
          description={t("defiProtocols.description")}
        />
      </div>

      <KpiSummaryRow />
      <StrategyComparisonTable />
      <ProtocolExplorer />
    </div>
  );
}
