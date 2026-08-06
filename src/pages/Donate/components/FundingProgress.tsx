import { useTranslation } from "react-i18next";

import { FUNDING_GOALS } from "@/config/donation";
import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";

function formatUSD(value: number) {
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Reuses the DeFi page's PoolOwnershipBar (a plain labeled fill bar) rather
// than introducing a new progress-visualization component — it was already
// built to stay calm at any percentage, which is exactly the "transparent,
// not aggressive fundraising" tone this section needs. Figures come from
// FUNDING_GOALS, explicitly placeholder/demo data (no billing backend
// exists yet) structured so a future API response can replace `raised`
// per goal without any component change.
export default function FundingProgress() {
  const { t } = useTranslation();
  const { monthly, development } = FUNDING_GOALS;

  const goals = [
    {
      key: monthly.label,
      titleKey: "donate.funding.monthlyInfrastructure",
      ...monthly,
    },
    {
      key: development.label,
      titleKey: "donate.funding.developmentFund",
      ...development,
    },
  ];

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8">
      <h3 className="text-sm font-semibold text-ink-primary">
        {t("donate.funding.title")}
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        {t("donate.funding.subtitle")}
      </p>

      <div className="mt-6 space-y-6">
        {goals.map((goal) => (
          <PoolOwnershipBar
            key={goal.key}
            label={t(goal.titleKey)}
            percentage={(goal.raised / goal.goal) * 100}
            valueLabel={t("donate.funding.raisedOfGoal", {
              raised: formatUSD(goal.raised),
              goal: formatUSD(goal.goal),
            })}
          />
        ))}
      </div>
    </div>
  );
}
