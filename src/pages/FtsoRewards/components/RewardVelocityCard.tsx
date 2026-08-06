import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { BoltIcon } from "@heroicons/react/24/outline";

import StatusBadge, { type StatusTone } from "@/pages/DefiProtocols/components/shared/StatusBadge";
import MetricTile from "@/pages/DefiProtocols/components/shared/MetricTile";
import SensitiveValue from "@/components/common/SensitiveValue";
import { formatFlr } from "@/utils/format";
import type { RewardsSummary } from "@/pages/FtsoRewards/utils/deriveFtsoRewards";

function humanize(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// `calculation_method` is treated as an open set (see deriveFtsoRewards.ts)
// — any value this doesn't explicitly recognize still gets a readable
// label instead of rendering blank or a raw SCREAMING_SNAKE_CASE string.
function getMethodInfo(method: string | null, t: TFunction): { label: string; tone: StatusTone } | null {
  if (!method) return null;
  switch (method) {
    case "LIVE_UNCLAIMED_LEDGER_VELOCITY":
      return { label: t("ftsoRewards.velocity.methodLive"), tone: "success" };
    case "HISTORICAL_BLOCK_FALLBACK_VELOCITY":
      return { label: t("ftsoRewards.velocity.methodHistorical"), tone: "neutral" };
    default:
      return { label: humanize(method), tone: "neutral" };
  }
}

interface RewardVelocityCardProps {
  summary: RewardsSummary;
}

// Shows the same underlying earning rate at three zoom levels (hour / day
// / this epoch) rather than just the one figure already on the KPI row —
// "0.0007 FLR/hr" alone doesn't give much sense of scale, but seeing it
// next to "this epoch" (the API's own projected total) does.
export default function RewardVelocityCard({ summary }: RewardVelocityCardProps) {
  const { t } = useTranslation();
  const methodInfo = getMethodInfo(summary.calculationMethod, t);

  if (summary.isInactive) {
    return (
      <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
        <h3 className="text-sm font-semibold text-ink-primary">{t("ftsoRewards.velocity.title")}</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <BoltIcon className="h-8 w-8 text-ink-muted mb-2" />
          <p className="text-sm font-medium text-ink-primary">
            {t("ftsoRewards.velocity.inactiveTitle")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted max-w-[220px]">
            {t("ftsoRewards.velocity.inactiveDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-primary">{t("ftsoRewards.velocity.title")}</h3>
        {methodInfo && <StatusBadge label={methodInfo.label} tone={methodInfo.tone} dot />}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MetricTile
          label={t("ftsoRewards.velocity.perHour")}
          value={<SensitiveValue>{formatFlr(summary.hourlyEarning, { maximumFractionDigits: 6 })}</SensitiveValue>}
        />
        <MetricTile
          label={t("ftsoRewards.velocity.perDay")}
          value={<SensitiveValue>{formatFlr(summary.dailyEarning)}</SensitiveValue>}
        />
        <MetricTile
          label={t("ftsoRewards.velocity.thisEpoch")}
          value={<SensitiveValue>{formatFlr(summary.targetEpochYield)}</SensitiveValue>}
        />
      </div>

      {summary.velocitySourceEpoch != null && (
        <p className="mt-4 text-[11px] text-ink-muted">
          {t("ftsoRewards.velocity.sourceEpoch", { epoch: summary.velocitySourceEpoch })}
        </p>
      )}
    </div>
  );
}
