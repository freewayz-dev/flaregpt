import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import GasSniperCard from "@/pages/Loops/components/GasSniperCard";

// Gas Sniper is the one real Loop today — no registry/grid the way
// DefiProtocols' PROTOCOLS array anticipates several, since inventing that
// structure for a single card would be speculative scaffolding for loops
// that don't exist yet. Add one the same way DefiProtocols grew past its
// first protocol: another card here, not a rearchitecture.
export default function Loops() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.loops")} description={t("loops.description")} />
      </div>

      <GasSniperCard />
    </div>
  );
}
