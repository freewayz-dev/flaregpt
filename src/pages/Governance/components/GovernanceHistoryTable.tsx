import { useTranslation } from "react-i18next";
import { ClockIcon, CheckIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import {
  computeVoteSplit,
  getProposalStatusMeta,
  isConcludedProposal,
  type Proposal,
} from "@/pages/Governance/utils/deriveGovernance";

interface GovernanceHistoryTableProps {
  proposals: Proposal[];
  hasVotedById: Map<string, boolean>;
  onOpenDetail: (proposal: Proposal) => void;
}

// A bespoke table rather than the shared GenericTable — GenericTable
// derives columns from raw object keys with no per-cell renderer, which
// can't produce a status badge or a for/against split; this instead
// matches its visual language by hand (sticky header, same header/cell
// classes, same `overflow-auto -mx-4 ... scrollbar-none` mobile
// horizontal-scroll convention) rather than introducing a different table
// style for one page.
export default function GovernanceHistoryTable({
  proposals,
  hasVotedById,
  onOpenDetail,
}: GovernanceHistoryTableProps) {
  const { t } = useTranslation();
  const hasWalletOverlay = hasVotedById.size > 0;

  const history = proposals
    .filter(isConcludedProposal)
    .sort((a, b) => b.voteEndTime - a.voteEndTime);

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{t("governance.history.title")}</h3>
      <p className="mt-1 text-xs text-ink-muted">{t("governance.history.subtitle")}</p>

      {history.length === 0 ? (
        <div className="mt-4">
          <WalletEmptyState
            icon={ClockIcon}
            title={t("governance.history.emptyTitle")}
            description={t("governance.history.emptyDescription")}
          />
        </div>
      ) : (
        <>
          {/* Mobile: a tappable card per proposal, not the desktop table —
              a wide multi-column table has no honest way to fit this many
              columns without horizontal scroll, which reads as "maybe
              clickable, maybe not" on a touch screen. Every card is a real
              <button> (the entire card is the hit target, not just the
              title), the title uses the main brand color (text-brand) with
              a permanent underline — this app's one existing "this is a
              link" convention — rather than only a hover color change that
              touch has no way to see, and a trailing chevron matches
              TransactionRow's own mobile-only "this opens something"
              affordance. Desktop's own title styling (below) is untouched
              by this — mobile only. */}
          <div className="mt-4 space-y-2 sm:hidden">
            {history.map((proposal) => {
              const status = getProposalStatusMeta(proposal.state, t);
              const split = computeVoteSplit(proposal);
              const voted = hasVotedById.get(proposal.id.toString());
              return (
                <button
                  key={proposal.id.toString()}
                  type="button"
                  onClick={() => onOpenDetail(proposal)}
                  className="w-full rounded-xl bg-surface-inset p-3 text-left transition-colors hover:bg-surface-card-hover cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusBadge label={status.label} tone={status.tone} dot={status.dot} />
                        {proposal.isHistorical && (
                          <StatusBadge label={t("governance.historicalBadge")} tone="neutral" dot={false} />
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-brand underline underline-offset-2">
                        {proposal.title}
                      </p>
                    </div>
                    <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary">
                    <span className="tabular-nums">
                      {split.totalVotes === 0n
                        ? "—"
                        : `${split.forPercent.toFixed(0)}% / ${split.againstPercent.toFixed(0)}%`}
                    </span>
                    <span>{formatDate(proposal.voteEndTime)}</span>
                  </div>
                  {hasWalletOverlay && (
                    <div className="mt-1.5 text-xs">
                      {voted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                          <CheckIcon className="h-3.5 w-3.5" />
                          {t("governance.voted")}
                        </span>
                      ) : (
                        <span className="text-ink-muted">{t("governance.notVoted")}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop/tablet: the real table, unchanged. This container has
              no vertical scroll of its own — `overflow-auto` only ever
              engages horizontally here (many columns on a narrower
              viewport). `overscroll-x-contain`, not the both-axis
              `overscroll-contain` — the latter meant a plain vertical
              mouse-wheel scroll while the cursor merely happened to be
              over this table got swallowed entirely (confirmed live: an
              element with no vertical scroll room is already "at its
              vertical boundary" the instant a vertical scroll starts, so
              both-axis `contain` blocked it from ever reaching the page).
              `overscroll-x-contain` keeps the one legitimate reason this
              was added — a horizontal swipe here shouldn't trigger the
              browser's back/forward navigation gesture — without touching
              the vertical axis at all. */}
          <div className="mt-4 hidden overflow-auto sm:block scrollbar-none overscroll-x-contain">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-divider">
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("governance.history.columnProposal")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("governance.history.columnStatus")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("governance.history.columnResult")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("governance.history.columnEnded")}
                  </th>
                  {hasWalletOverlay && (
                    <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                      {t("governance.history.columnYourVote")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {history.map((proposal) => {
                  const status = getProposalStatusMeta(proposal.state, t);
                  const split = computeVoteSplit(proposal);
                  const voted = hasVotedById.get(proposal.id.toString());
                  return (
                    <tr
                      key={proposal.id.toString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenDetail(proposal)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenDetail(proposal);
                        }
                      }}
                      // Same hover/focus treatment the row already had
                      // (background tint), just now the real hit target —
                      // `group` lets the title's color react to hovering
                      // anywhere on the row, not only the title text itself.
                      className="group cursor-pointer transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2"
                    >
                      <td className="py-2.5 pr-4 max-w-[220px]">
                        <span
                          className="truncate block max-w-full font-medium text-ink-primary transition-colors group-hover:text-brand"
                          title={proposal.title}
                        >
                          {proposal.title}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadge label={status.label} tone={status.tone} dot={status.dot} />
                          {proposal.isHistorical && (
                            <StatusBadge label={t("governance.historicalBadge")} tone="neutral" dot={false} />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-ink-primary font-medium tabular-nums">
                        {split.totalVotes === 0n ? "—" : `${split.forPercent.toFixed(0)}% / ${split.againstPercent.toFixed(0)}%`}
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-ink-secondary">
                        {formatDate(proposal.voteEndTime)}
                      </td>
                      {hasWalletOverlay && (
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {voted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                              <CheckIcon className="h-3.5 w-3.5" />
                              {t("governance.voted")}
                            </span>
                          ) : (
                            <span className="text-ink-muted">{t("governance.notVoted")}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
