import { useTranslation } from "react-i18next";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import VoteSplitBar from "@/pages/Governance/components/VoteSplitBar";
import {
  computeVoteSplit,
  getProposalStatusMeta} from "@/pages/Governance/utils/deriveGovernance";



// A card, not a compact list row — unlike Governance History (a table of
// many concluded proposals), there are realistically 0-1 active proposals
// at once (Flare's own voting period is ~1 week and FIPs land every 1-2
// months — confirmed live: 6 total proposals since FIP-11, none active
// right now), so this is a moment worth the same visual weight as any
// other real dashboard card, not a dense row.
export default function ActiveProposalCard({ proposal, hasVoted, onOpenDetail }) {
  const { t } = useTranslation();
  const status = getProposalStatusMeta(proposal.state, t);
  const split = computeVoteSplit(proposal);
  const endsIn = formatEndsIn(proposal.voteEndTime, t);

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(proposal)}
      className="w-full text-left rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none hover:bg-surface-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <StatusBadge label={status.label} tone={status.tone} dot={status.dot} />
          <h3 className="mt-1.5 text-sm font-semibold text-ink-primary truncate">{proposal.title}</h3>
        </div>
        {hasVoted !== undefined && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
              hasVoted ? "text-emerald-500" : "text-ink-muted"
            }`}
          >
            {hasVoted && <CheckCircleIcon className="h-3.5 w-3.5" />}
            {hasVoted ? t("governance.youVoted") : t("governance.notVotedYet")}
          </span>
        )}
      </div>

      <div className="mt-4">
        <VoteSplitBar split={split} />
      </div>

      <p className="mt-3 text-xs text-ink-muted">{endsIn}</p>
    </button>
  );
}

function formatEndsIn(voteEndTimeSeconds, t) {
  const msRemaining = voteEndTimeSeconds * 1000 - Date.now();
  if (msRemaining <= 0) return t("governance.votingEnded");
  const days = Math.floor(msRemaining / 86_400_000);
  const hours = Math.floor((msRemaining % 86_400_000) / 3_600_000);
  if (days > 0) return t("governance.endsInDays", { days, hours });
  return t("governance.endsInHours", { hours: Math.max(1, hours) });
}
