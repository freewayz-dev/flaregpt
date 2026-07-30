import { useTranslation } from "react-i18next";
import { CalendarDaysIcon, SparklesIcon } from "@heroicons/react/24/outline";

import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import SensitiveValue from "@/components/common/SensitiveValue";
import { formatFlr, formatDate } from "@/utils/format";

// Combines the two wallet-specific endpoints (melt schedule + exit quote)
// into one card rather than two — "when is my next unlock" and "what would
// I walk away with if I exited today instead of waiting" are the same
// underlying question ("where do I stand on vesting right now"), so they
// read as one narrative here instead of two disconnected stat blocks.
export default function VestingProgressCard({ summary, nextUnlock, isNextUnlockLoading }) {
  const { t } = useTranslation();
  const efficiencyPct = summary.efficiencyLabel ? parseFloat(summary.efficiencyLabel) : null;

  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <h3 className="text-sm font-semibold text-ink-primary">
        {t("rflrVesting.progress.title")}
      </h3>

      <div className="mt-4">
        <PoolOwnershipBar
          label={t("rflrVesting.progress.vestedLabel")}
          percentage={summary.vestedPercent}
          valueLabel={`${summary.vestedPercent.toFixed(1)}%`}
        />
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-inset p-3">
        <CalendarDaysIcon className="h-4 w-4 shrink-0 mt-0.5 text-ink-muted" />
        <div className="min-w-0">
          {isNextUnlockLoading ? (
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          ) : nextUnlock ? (
            <>
              <p className="text-xs font-medium text-ink-primary">
                {t("rflrVesting.progress.nextUnlock", { date: formatDate(nextUnlock.date) })}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                <SensitiveValue>{formatFlr(nextUnlock.amount)}</SensitiveValue>{" "}
                {t("rflrVesting.progress.nextUnlockCaption")}
              </p>
            </>
          ) : (
            <p className="text-xs font-medium text-ink-primary">
              {t("rflrVesting.progress.fullyVested")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-divider">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="h-3.5 w-3.5 text-ink-muted" />
            <p className="text-xs font-semibold text-ink-primary">
              {t("rflrVesting.progress.earlyExitTitle")}
            </p>
          </div>
          {!summary.isFullyVested && efficiencyPct != null && (
            <StatusBadge
              label={t("rflrVesting.progress.efficiency", { pct: efficiencyPct.toFixed(0) })}
              tone={efficiencyPct >= 90 ? "success" : "warning"}
            />
          )}
        </div>

        {summary.isFullyVested ? (
          <p className="text-xs text-ink-muted">
            {t("rflrVesting.progress.earlyExitNoneNeeded")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-ink-muted">{t("rflrVesting.progress.netPayout")}</p>
              <p className="text-sm font-semibold text-ink-primary">
                <SensitiveValue>{formatFlr(summary.netPayout)}</SensitiveValue>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-muted">{t("rflrVesting.progress.penaltyCost")}</p>
              <p className="text-sm font-semibold text-red-500">
                <SensitiveValue>{formatFlr(summary.penalty)}</SensitiveValue>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
