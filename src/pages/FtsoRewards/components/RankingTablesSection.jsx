import { useState } from "react";
import { useTranslation } from "react-i18next";

import ProviderRankingCard from "@/pages/FtsoRewards/components/ProviderRankingCard";
import ValidatorRankingCard from "@/pages/FtsoRewards/components/ValidatorRankingCard";

// Formerly ComingSoonTablesSection — renamed now that both tables are
// wired to real data (provider-rankings/validator-rankings), since the old
// name described exactly the opposite of what this renders now. Layout
// unchanged from the original: below `lg`, FTSO Providers and Validators
// share a single row via tabs instead of stacking, same pattern as
// ClaimsAndDelegationsSection's MobileTabs/ActivityCharts' ChartTabs.
// Each card now owns its own query/loading/error state independently, so
// switching tabs is still just a local flip — no extra fetch triggered by
// the tab switch itself (both queries already run regardless of which tab
// is visible, same as any other pair of cards on this page).
export default function RankingTablesSection() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("providers");

  const TABS = [
    { id: "providers", label: t("ftsoRewards.providers.title") },
    { id: "validators", label: t("ftsoRewards.validators.title") },
  ];

  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center gap-2" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-brand text-white"
                  : "bg-surface-inset text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "providers" ? <ProviderRankingCard /> : <ValidatorRankingCard />}
        </div>
      </div>

      <div className="hidden lg:grid gap-5 lg:grid-cols-2">
        <ProviderRankingCard />
        <ValidatorRankingCard />
      </div>
    </>
  );
}
