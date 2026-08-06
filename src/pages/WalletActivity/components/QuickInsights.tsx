import { useTranslation } from "react-i18next";
import { CircleStackIcon, BoltIcon, FireIcon, CalendarIcon } from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode, SVGProps } from "react";

import TokenIcon from "@/components/common/TokenIcon";
import type { QuickInsightsResult } from "@/pages/WalletActivity/utils/deriveActivity";

interface InsightCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: ReactNode;
  value: ReactNode;
  tokenSymbol?: string;
  countLabel: ReactNode;
}

function InsightCard({ icon: Icon, label, value, tokenSymbol, countLabel }: InsightCardProps) {
  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs text-ink-secondary leading-tight">{label}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5 min-w-0">
        {tokenSymbol && <TokenIcon symbol={tokenSymbol} size={16} />}
        <p className="text-sm font-bold text-ink-primary truncate">{value}</p>
      </div>
      <p className="mt-1 text-[11px] text-ink-muted truncate">{countLabel}</p>
    </div>
  );
}

// R4 in the approved plan: lightweight cards derived entirely from
// `history` counts — no price data, nothing estimated. Each one answers a
// single, honest question ("what does this wallet touch most") rather
// than trying to look like a dashboard metric it can't actually back up.
interface QuickInsightsProps {
  insights: QuickInsightsResult | null;
}

export default function QuickInsights({ insights }: QuickInsightsProps) {
  const { t } = useTranslation();
  if (!insights) return null;

  const { mostUsedAsset, mostCommonAction, mostActiveDay, mostActiveMonth } = insights;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {t("wallet.activity.insights.title")}
      </p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-4 scroll-pr-4 -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-4 sm:overflow-visible scrollbar-none">
        {mostUsedAsset && (
          <div className="min-w-[150px] sm:min-w-0 snap-start">
            <InsightCard
              icon={CircleStackIcon}
              label={t("wallet.activity.insights.mostUsedAsset")}
              value={mostUsedAsset.asset}
              tokenSymbol={mostUsedAsset.asset}
              countLabel={t("wallet.activity.insights.txCount", { count: mostUsedAsset.count })}
            />
          </div>
        )}
        {mostCommonAction && (
          <div className="min-w-[150px] sm:min-w-0 snap-start">
            <InsightCard
              icon={BoltIcon}
              label={t("wallet.activity.insights.mostCommonAction")}
              value={mostCommonAction.label}
              countLabel={t("wallet.activity.insights.txCount", { count: mostCommonAction.count })}
            />
          </div>
        )}
        {mostActiveDay && (
          <div className="min-w-[150px] sm:min-w-0 snap-start">
            <InsightCard
              icon={FireIcon}
              label={t("wallet.activity.insights.mostActiveDay")}
              value={mostActiveDay.label}
              countLabel={t("wallet.activity.insights.txCount", { count: mostActiveDay.count })}
            />
          </div>
        )}
        {mostActiveMonth && (
          <div className="min-w-[150px] sm:min-w-0 snap-start">
            <InsightCard
              icon={CalendarIcon}
              label={t("wallet.activity.insights.mostActiveMonth")}
              value={mostActiveMonth.label}
              countLabel={t("wallet.activity.insights.txCount", { count: mostActiveMonth.count })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
