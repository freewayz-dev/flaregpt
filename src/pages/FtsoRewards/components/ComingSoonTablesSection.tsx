import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BuildingLibraryIcon, TrophyIcon } from "@heroicons/react/24/outline";

import ComingSoonTableCard from "@/pages/FtsoRewards/components/ComingSoonTableCard";

// Below `lg`, FTSO Providers and Staking Validators Ranking share a single
// row via tabs instead of stacking as two full cards — same pattern (and
// same active/inactive tab styling) as ClaimsAndDelegationsSection's
// MobileTabs on Overview and ActivityCharts' ChartTabs on Wallet Activity.
// Both are static placeholders (neither depends on a query), so switching
// tabs is just a local state flip — no loading, no re-fetch.
export default function ComingSoonTablesSection() {
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
          {activeTab === "providers" ? (
            <ComingSoonTableCard
              icon={BuildingLibraryIcon}
              title={t("ftsoRewards.providers.title")}
              description={t("ftsoRewards.providers.description")}
            />
          ) : (
            <ComingSoonTableCard
              icon={TrophyIcon}
              title={t("ftsoRewards.validators.title")}
              description={t("ftsoRewards.validators.description")}
            />
          )}
        </div>
      </div>

      <div className="hidden lg:grid gap-5 lg:grid-cols-2">
        <ComingSoonTableCard
          icon={BuildingLibraryIcon}
          title={t("ftsoRewards.providers.title")}
          description={t("ftsoRewards.providers.description")}
        />
        <ComingSoonTableCard
          icon={TrophyIcon}
          title={t("ftsoRewards.validators.title")}
          description={t("ftsoRewards.validators.description")}
        />
      </div>
    </>
  );
}
