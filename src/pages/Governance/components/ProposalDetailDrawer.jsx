import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";


import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { copyWalletAddress, shortenAddress } from "@/utils/address";
import { getFlarescanAddressUrl, getSongbirdExplorerAddressUrl } from "@/config/web3Config";
import { useVotesAtBlock } from "@/hooks/queries/useGovernanceQueries";

import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import VoteSplitBar from "@/pages/Governance/components/VoteSplitBar";
import {
  computeVoteSplit,
  formatVotePowerCompact,
  bipsToPercentLabel,
  getProposalStatusMeta,
  getProposalDocUrl} from "@/pages/Governance/utils/deriveGovernance";



function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-divider last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink-primary text-right">{children}</span>
    </div>
  );
}



// Same right-side-drawer-on-desktop/full-screen-on-mobile shell
// TransactionDrawer.tsx already established for "view more detail on a
// row" — no Prev/Next here (unlike a transaction feed, proposals aren't
// naturally browsed sequentially from this view), keeping the surface
// area smaller than the pattern it's borrowed from rather than adding
// navigation nobody asked for.
export default function ProposalDetailDrawer({
  network,
  proposal,
  activeAddress,
  hasVoted,
  onClose,
}) {
  const { t } = useTranslation();
  const open = Boolean(proposal);
  const returnFocusRef = useRef(null);
  const closeButtonRef = useRef(null);
  const drawerRef = useRef(null);

  useFocusTrap(drawerRef, open);

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (returnFocusRef.current instanceof HTMLElement) {
      returnFocusRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // The wallet's real voting power at *this proposal's own* snapshot block
  // — not its current power, which can be a materially different number
  // for a concluded proposal (balances move over time). Fetched only while
  // this drawer is actually open for a proposal, not upfront for every
  // proposal in the list.
  const { data: votePowerAtSnapshot } = useVotesAtBlock(network, activeAddress, proposal?.votePowerBlock);

  const status = proposal ? getProposalStatusMeta(proposal.state, t) : null;
  const split = proposal ? computeVoteSplit(proposal) : null;
  const docUrl = proposal ? getProposalDocUrl(proposal.title) : null;
  const explorerAddressUrl = proposal
    ? network === "songbird"
      ? getSongbirdExplorerAddressUrl(proposal.proposer)
      : getFlarescanAddressUrl(proposal.proposer)
    : null;

  const handleCopyProposer = async () => {
    if (!proposal) return;
    const success = await copyWalletAddress(proposal.proposer);
    if (success) toast.success(t("navbar.addressCopied"));
    else toast.error(t("navbar.copyFailed"));
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 hidden bg-black/20 transition-opacity duration-300 sm:block ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("governance.drawer.title")}
        className={`fixed z-50 flex flex-col bg-[#FFFFFF] dark:bg-[#161619] border border-[#E5E7EB] dark:border-none shadow-xl
          inset-0 rounded-none
          sm:inset-auto sm:right-4 sm:top-20 sm:bottom-4 sm:w-[420px] sm:rounded-2xl
          transition-all duration-300 ease-in-out
          ${open ? "translate-x-0 opacity-100" : "translate-x-full sm:translate-x-[120%] opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
          <p className="text-sm font-semibold text-ink-primary">{t("governance.drawer.title")}</p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            title={t("governance.drawer.close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {proposal && status && split && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge label={status.label} tone={status.tone} dot={status.dot} />
              {proposal.isHistorical && (
                <StatusBadge label={t("governance.historicalBadge")} tone="neutral" dot={false} />
              )}
            </div>
            <h2 className="mt-1.5 text-base font-bold text-ink-primary">{proposal.title}</h2>

            <div className="mt-4">
              <VoteSplitBar split={split} />
            </div>

            <div className="mt-5">
              <DetailRow label={t("governance.drawer.proposer")}>
                <button
                  type="button"
                  onClick={handleCopyProposer}
                  className="inline-flex items-center gap-1 font-mono hover:text-brand-text transition-colors cursor-pointer"
                  title={proposal.proposer}
                >
                  {shortenAddress(proposal.proposer)}
                  <ClipboardIcon className="h-3 w-3 opacity-60" />
                </button>
              </DetailRow>
              <DetailRow label={t("governance.drawer.votingPeriod")}>
                {formatDate(proposal.voteStartTime)} – {formatDate(proposal.voteEndTime)}
              </DetailRow>
              <DetailRow label={t("governance.drawer.quorum")}>
                {proposal.thresholdBips === 0
                  ? t("governance.drawer.quorumNotRequired")
                  : bipsToPercentLabel(proposal.thresholdBips)}
              </DetailRow>
              <DetailRow label={t("governance.drawer.majorityRequired")}>
                {bipsToPercentLabel(proposal.majorityBips)}
              </DetailRow>
              <DetailRow label={t("governance.drawer.circulatingSupply")}>
                {formatVotePowerCompact(proposal.circulatingSupply)}
              </DetailRow>

              {activeAddress && (
                <>
                  <DetailRow label={t("governance.drawer.yourVote")}>
                    {hasVoted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <CheckCircleIcon className="h-4 w-4" />
                        {t("governance.voted")}
                      </span>
                    ) : (
                      <span className="text-ink-muted">{t("governance.notVoted")}</span>
                    )}
                  </DetailRow>
                  <DetailRow label={t("governance.drawer.yourVotingPower")}>
                    {votePowerAtSnapshot !== undefined ? formatVotePowerCompact(votePowerAtSnapshot) : "—"}
                  </DetailRow>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  {t("governance.drawer.readFullProposal")}
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </a>
              )}
              <a
                href={explorerAddressUrl ?? getFlarescanAddressUrl(proposal.proposer)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {t("governance.drawer.viewProposerOnExplorer")}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}

function formatDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
