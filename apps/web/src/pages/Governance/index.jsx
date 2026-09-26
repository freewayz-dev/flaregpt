import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { useConnection } from "wagmi";
import { isAddress } from "viem";

import PageHeader from "@/components/common/PageHeader";
import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import {
  useProposalIds,
  useProposals,
  useHistoricalProposals,
  useUserHasVoted,
  useCurrentVotingPower,
} from "@/hooks/queries/useGovernanceQueries";


import GovernanceOverviewStats from "@/pages/Governance/components/GovernanceOverviewStats";
import YourGovernance from "@/pages/Governance/components/YourGovernance";
import ActiveProposalsSection from "@/pages/Governance/components/ActiveProposalsSection";
import GovernanceHistoryTable from "@/pages/Governance/components/GovernanceHistoryTable";
import ProposalDetailDrawer from "@/pages/Governance/components/ProposalDetailDrawer";
import {
  computeGovernanceStats,
  computeUserParticipation,
  isConcludedProposal} from "@/pages/Governance/utils/deriveGovernance";

const NETWORKS = ["flare", "songbird"];

// Unlike RflrVesting/FtsoRewards, this page is NOT gated behind a single
// wallet-scoped query — governance itself (proposals, vote tallies,
// outcomes) is public on-chain data with no wallet involved at all, so the
// Overview stats, Active Proposals, and History sections always attempt to
// render regardless of whether any wallet is connected or watchlisted.
// Only the "Your Governance" section is wallet-gated, since it's the one
// piece of genuinely personal information (this wallet's voting power and
// participation) — matching DefiProtocols' per-section gating convention
// rather than RflrVesting/FtsoRewards' whole-page gate, since this page
// isn't "one wallet's dataset" the way those are.
export default function Governance() {
  const { t } = useTranslation();
  const { openWalletModal } = useOutletContext();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress: rawActiveAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  // `activeAddress` is a plain `string` in the store (a guest's tracked-
  // wallet address is free-typed input, never checksummed/branded — see
  // useWalletHubStore.ts), while every governance contract read below
  // needs viem's branded `Address`. Same real `isAddress()` runtime check
  // already established in WalletContextPill.tsx, not an assertion — a
  // malformed address (or the store's "" no-wallet sentinel) is treated
  // as no wallet rather than passed through.
  const activeAddress = isAddress(rawActiveAddress) ? rawActiveAddress : undefined;

  // Defaults to Flare — the page's existing, already-familiar behavior is
  // unchanged for anyone who never touches the toggle. Songbird (SIP/STP)
  // is opt-in via the same switch.
  const [network, setNetwork] = useState("flare");

  const idsQuery = useProposalIds(network);
  const ids = idsQuery.data;
  const proposalsQuery = useProposals(network, ids);
  const historicalQuery = useHistoricalProposals(network);
  const hasVotedQuery = useUserHasVoted(network, activeAddress, ids);
  const votingPowerQuery = useCurrentVotingPower(network, activeAddress);

  const [selectedProposalId, setSelectedProposalId] = useState(null);

  const isLoading =
    idsQuery.isLoading ||
    (Boolean(ids?.length) && proposalsQuery.isLoading) ||
    historicalQuery.isLoading;
  // `isIncomplete`: the ids list came back, but fewer proposals decoded
  // successfully than actually exist on-chain — a real, retryable failure,
  // not a legitimate "there are just fewer proposals" empty/short state
  // (see useProposals' own comment). Treated the same as a hard error so
  // Governance History can never silently under-report real history.
  const isError =
    idsQuery.isError || proposalsQuery.isError || proposalsQuery.isIncomplete || historicalQuery.isError;
  const isFetching = idsQuery.isFetching || proposalsQuery.isFetching || historicalQuery.isFetching;

  // Current + historical, merged into the one list every section below
  // already knows how to render — each Proposal carries its own
  // `isHistorical`/`network` flag (see deriveGovernance.ts) so
  // GovernanceHistoryTable can label the two apart. Historical proposals
  // are all years-concluded, so they only ever surface in History, never
  // in Active Proposals, with no extra filtering needed here.
  const proposals = useMemo(() => {
    if (!proposalsQuery.proposals) return undefined;
    return [...proposalsQuery.proposals, ...(historicalQuery.proposals ?? [])];
  }, [proposalsQuery.proposals, historicalQuery.proposals]);

  const stats = useMemo(
    () => computeGovernanceStats(proposals ?? []),
    [proposals],
  );

  const concludedProposals = useMemo(
    () => (proposals ?? []).filter(isConcludedProposal),
    [proposals],
  );

  const participation = useMemo(() => {
    if (!activeAddress || hasVotedQuery.hasVotedById.size === 0) return undefined;
    return computeUserParticipation(concludedProposals, hasVotedQuery.hasVotedById);
  }, [activeAddress, concludedProposals, hasVotedQuery.hasVotedById]);

  const selectedProposal = useMemo(() => {
    if (selectedProposalId === null || !proposals) return null;
    return proposals.find((p) => p.id === selectedProposalId) ?? null;
  }, [selectedProposalId, proposals]);

  const handleRetry = () => {
    idsQuery.refetch();
    proposalsQuery.refetch();
    historicalQuery.refetch();
  };

  const handleNetworkChange = (next) => {
    if (next === network) return;
    setNetwork(next);
    // A proposal id from the previous network's list is meaningless once
    // the underlying data source switches out from under it.
    setSelectedProposalId(null);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="flex flex-wrap items-start justify-between gap-3 pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.governance")} description={t("governance.description")} />

        {/* Same segmented-control pattern as FlrPriceChart's timeframe
            switch — reused, not redesigned. */}
        <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1 shrink-0">
          {NETWORKS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleNetworkChange(n)}
              aria-pressed={network === n}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                network === n ? "bg-brand text-white" : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {t(`governance.network.${n}`)}
            </button>
          ))}
        </div>
      </div>

      <GovernanceOverviewStats stats={stats} />

      <YourGovernance
        hasWallet={Boolean(activeAddress)}
        votingPower={votingPowerQuery.data}
        isLoadingVotingPower={votingPowerQuery.isLoading}
        participation={participation}
        onOpenWalletModal={openWalletModal}
      />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink-primary">{t("governance.active.title")}</h3>
        <ActiveProposalsSection
          proposals={proposals}
          hasVotedById={hasVotedQuery.hasVotedById}
          isLoading={isLoading}
          isError={isError}
          isFetching={isFetching}
          onRetry={handleRetry}
          onOpenDetail={(proposal) => setSelectedProposalId(proposal.id)}
        />
      </div>

      {!isLoading && !isError && (
        <GovernanceHistoryTable
          proposals={proposals ?? []}
          hasVotedById={hasVotedQuery.hasVotedById}
          onOpenDetail={(proposal) => setSelectedProposalId(proposal.id)}
        />
      )}

      <ProposalDetailDrawer
        network={network}
        proposal={selectedProposal}
        activeAddress={activeAddress}
        hasVoted={selectedProposal ? hasVotedQuery.hasVotedById.get(selectedProposal.id.toString()) : undefined}
        onClose={() => setSelectedProposalId(null)}
      />
    </div>
  );
}
