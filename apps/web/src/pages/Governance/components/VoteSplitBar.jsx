import { useTranslation } from "react-i18next";

import { formatVotePowerCompact} from "@/pages/Governance/utils/deriveGovernance";

// Same track/label shape as DeFi's PoolOwnershipBar (h-1.5 rounded-full
// bg-surface-inset track, label row above), extended to two fill segments
// since a vote genuinely has two competing quantities rather than one
// share of a whole — for (emerald-500, this app's established positive
// color) and against (red-500, its established negative color, matching
// StatusBadge's new "danger" tone). A real `role="progressbar"` per
// segment (not one bar split visually) so each portion's exact percentage
// is announced, not just implied by width.


export default function VoteSplitBar({ split }) {
  const { t } = useTranslation();
  const { forPercent, againstPercent, forVotes, againstVotes, totalVotes } = split;

  if (totalVotes === 0n) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-ink-muted">{t("governance.voteSplit.label")}</span>
          <span className="text-xs font-semibold text-ink-muted">{t("governance.voteSplit.noVotesYet")}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-inset overflow-hidden" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-3">
        <span className="text-xs text-emerald-500 font-semibold">
          {t("governance.voteSplit.for", { percent: forPercent.toFixed(1) })}
        </span>
        <span className="text-xs text-red-500 font-semibold">
          {t("governance.voteSplit.against", { percent: againstPercent.toFixed(1) })}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-inset overflow-hidden flex">
        <div
          role="progressbar"
          aria-valuenow={forPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("governance.voteSplit.for", { percent: forPercent.toFixed(1) })}
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${forPercent}%` }}
        />
        <div
          role="progressbar"
          aria-valuenow={againstPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("governance.voteSplit.against", { percent: againstPercent.toFixed(1) })}
          className="h-full bg-red-500 transition-all duration-500 ease-out"
          style={{ width: `${againstPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-ink-muted">
        {t("governance.voteSplit.forCount")}: {formatVotePowerCompact(forVotes)} ·{" "}
        {t("governance.voteSplit.againstCount")}: {formatVotePowerCompact(againstVotes)}
      </p>
    </div>
  );
}
