import { useTranslation } from "react-i18next";
import { ArrowPathIcon, MegaphoneIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import ActiveProposalCard from "@/pages/Governance/components/ActiveProposalCard";
import ActiveProposalsSkeleton from "@/pages/Governance/components/skeletons/ActiveProposalsSkeleton";
import { isActiveProposal, type Proposal } from "@/pages/Governance/utils/deriveGovernance";

interface ActiveProposalsSectionProps {
  proposals: Proposal[] | undefined;
  hasVotedById: Map<string, boolean>;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onOpenDetail: (proposal: Proposal) => void;
}

// Public data — rendered regardless of whether any wallet is connected or
// watchlisted, per the requirement that a watchlist wallet sees the same
// public governance information a connected one does. `hasVotedById` is
// simply empty when no wallet is available, which ActiveProposalCard
// already treats as "don't show a voted/not-voted chip at all" rather than
// a fake "not voted" claim.
export default function ActiveProposalsSection({
  proposals,
  hasVotedById,
  isLoading,
  isError,
  isFetching,
  onRetry,
  onOpenDetail,
}: ActiveProposalsSectionProps) {
  const { t } = useTranslation();

  if (isLoading) return <ActiveProposalsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
        <p className="text-sm font-medium text-ink-primary">{t("governance.active.couldntLoad")}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isFetching}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
        </button>
      </div>
    );
  }

  const active = (proposals ?? []).filter(isActiveProposal);

  if (active.length === 0) {
    return (
      <WalletEmptyState
        icon={MegaphoneIcon}
        title={t("governance.active.emptyTitle")}
        description={t("governance.active.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {active.map((proposal) => (
        <ActiveProposalCard
          key={proposal.id.toString()}
          proposal={proposal}
          hasVoted={hasVotedById.size > 0 ? hasVotedById.get(proposal.id.toString()) : undefined}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}
