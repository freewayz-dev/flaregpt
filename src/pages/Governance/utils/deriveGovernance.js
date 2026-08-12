



// Real enum order from Flare's IGovernor.sol (confirmed against the live
// contract — see config/governance.ts's own comment).
export const ProposalStateValue = {
  Pending: 0,
  Active: 1,
  Defeated: 2,
  Succeeded: 3,
  Queued: 4,
  Expired: 5,
  Executed: 6,
  Canceled: 7,
};



// Raw shape of one `getProposalInfo` tuple result, exactly as
// wagmi/viem decode it (positional, not named). Exported so
// useGovernanceQueries.ts can cast its (positionally-untypeable, since the
// contracts array is built at runtime via flatMap) multicall results back
// to their real, ABI-confirmed shape before handing them to buildProposal.
// Covers both the current contracts' 11-field shape (description included)
// and the historical contracts' 10-field shape (description omitted — see
// config/governance.ts's HISTORICAL_POLLING_ABI) via the optional final
// element.



export function buildProposal(
  id,
  info,
  votes,
  state,
  network,
  isHistorical,
  // Only used for historical proposals, whose `getProposalInfo` doesn't
  // include a description at all (see ProposalInfoTuple's comment) — their
  // real title comes from the ProposalCreated event instead (see
  // useGovernanceQueries.ts's useHistoricalProposals).
  descriptionOverride,
) {
  const [
    proposer,
    accept,
    votePowerBlock,
    voteStartTime,
    voteEndTime,
    execStartTime,
    execEndTime,
    thresholdConditionBIPS,
    majorityConditionBIPS,
    circulatingSupply,
    description,
  ] = info;

  return {
    id,
    // The on-chain `description` field is short by convention (every real
    // proposal observed live is a single-line title, e.g. "FIP-16:
    // Restructure FLR Tokenomics for Long-Term Network Sustainability") —
    // trimmed defensively in case a future proposal includes a longer body
    // on a second line, so the title never bleeds newlines into card/table
    // layout.
    title: (descriptionOverride ?? description ?? "").split("\n")[0].trim(),
    proposer,
    accept,
    votePowerBlock,
    voteStartTime: Number(voteStartTime),
    voteEndTime: Number(voteEndTime),
    execStartTime: Number(execStartTime),
    execEndTime: Number(execEndTime),
    thresholdBips: Number(thresholdConditionBIPS),
    majorityBips: Number(majorityConditionBIPS),
    circulatingSupply,
    forVotes: votes[0],
    againstVotes: votes[1],
    state,
    network,
    isHistorical,
  };
}

export function isActiveProposal(proposal) {
  return proposal.state === ProposalStateValue.Active;
}

// "Concluded" for Governance History purposes — anything no longer
// pending or actively being voted on, regardless of outcome.
export function isConcludedProposal(proposal) {
  return proposal.state !== ProposalStateValue.Pending && proposal.state !== ProposalStateValue.Active;
}

// Whether the proposal's outcome, once decided, was a pass — used for the
// overview "Passed" stat. Succeeded/Queued/Expired/Executed are all real,
// distinct on-chain states, but every one of them means the vote itself
// passed (Queued is the de-facto terminal state for FIPs the Foundation
// executes off-chain, since `executableOnChain` is false for those — see
// Governor.sol's `_state()`; Expired only follows a Queued proposal whose
// on-chain execution window lapsed unused, still a passed vote).
export function isPassedProposal(proposal) {
  return (
    proposal.state === ProposalStateValue.Succeeded ||
    proposal.state === ProposalStateValue.Queued ||
    proposal.state === ProposalStateValue.Expired ||
    proposal.state === ProposalStateValue.Executed
  );
}

export function isDefeatedProposal(proposal) {
  return proposal.state === ProposalStateValue.Defeated;
}



// Presentation-layer synonyms over the real enum value — e.g. Queued is
// relabeled "Passed" because that's what it actually means for a Flare
// FIP in practice (see isPassedProposal's comment), not a fabrication of
// new data, just a plainer name for the same real state.
export function getProposalStatusMeta(state, t) {
  switch (state) {
    case ProposalStateValue.Pending:
      return { label: t("governance.status.pending"), tone: "neutral", dot: false };
    case ProposalStateValue.Active:
      return { label: t("governance.status.active"), tone: "success", dot: true };
    case ProposalStateValue.Defeated:
      return { label: t("governance.status.defeated"), tone: "danger", dot: false };
    case ProposalStateValue.Succeeded:
    case ProposalStateValue.Queued:
    case ProposalStateValue.Expired:
      return { label: t("governance.status.passed"), tone: "success", dot: false };
    case ProposalStateValue.Executed:
      return { label: t("governance.status.executed"), tone: "success", dot: false };
    case ProposalStateValue.Canceled:
      return { label: t("governance.status.canceled"), tone: "neutral", dot: false };
    default:
      return { label: t("governance.status.unknown"), tone: "neutral", dot: false };
  }
}



export function computeVoteSplit(proposal) {
  const total = proposal.forVotes + proposal.againstVotes;
  if (total === 0n) {
    return { forVotes: 0n, againstVotes: 0n, forPercent: 0, againstPercent: 0, totalVotes: 0n };
  }
  const forPercent = (Number(proposal.forVotes) / Number(total)) * 100;
  return {
    forVotes: proposal.forVotes,
    againstVotes: proposal.againstVotes,
    forPercent,
    againstPercent: 100 - forPercent,
    totalVotes: total,
  };
}



export function computeGovernanceStats(proposals) {
  return {
    total: proposals.length,
    active: proposals.filter(isActiveProposal).length,
    passed: proposals.filter(isPassedProposal).length,
    defeated: proposals.filter(isDefeatedProposal).length,
  };
}



// Only counts concluded proposals — participation in something still
// Pending/Active can't be measured yet (voting may not have opened, or
// may still be open with the user simply not having voted *yet*, which
// isn't the same as "didn't participate").
export function computeUserParticipation(
  concludedProposals,
  hasVotedById,
) {
  const voted = concludedProposals.filter((p) => hasVotedById.get(p.id.toString())).length;
  return { voted, total: concludedProposals.length };
}

// A wei-denominated FLR quantity, compact-formatted (e.g. "5.58B FLR") —
// same convention as RflrVesting's NetworkPulseSection.tsx's own
// formatFlrCompact, replicated here rather than imported since that one is
// scoped to a single-file-local helper by the same established pattern
// elsewhere in this codebase (small, single-purpose formatters live next
// to their one real caller instead of a shared utils module).
export function formatVotePowerCompact(weiValue) {
  const flrValue = Number(weiValue) / 1e18;
  return `${flrValue.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })} FLR`;
}

export function bipsToPercentLabel(bips) {
  return `${(bips / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

// Every real proposal observed on-chain follows Flare's own "FIP-NN: ..." /
// "SIP-NN: ..." / "STP-NN: ..." title convention — when it matches, this is
// a genuine, verifiable deep link to the proposal's real rationale/body on
// Flare's official site (proposals.flare.network), which the on-chain
// `description` field never contains (it's title-only). Returns null
// rather than a guess when a title doesn't match, so nothing is ever
// fabricated or linked incorrectly.
export function getFipProposalUrl(title) {
  const match = title.match(/FIP-(\d+)/i);
  if (!match) return null;
  const number = match[1].padStart(2, "0");
  return `https://proposals.flare.network/FIP/FIP_${number}.html`;
}

// Same reasoning as getFipProposalUrl, for Songbird's two proposal types.
export function getSipProposalUrl(title) {
  const match = title.match(/SIP-(\d+)/i);
  if (!match) return null;
  const number = match[1].padStart(2, "0");
  return `https://proposals.flare.network/SIP/SIP_${number}.html`;
}

export function getStpProposalUrl(title) {
  const match = title.match(/STP-(\d+)/i);
  if (!match) return null;
  const number = match[1].padStart(2, "0");
  return `https://proposals.flare.network/STP/STP_${number}.html`;
}

// Single entry point the UI actually uses — tries every real proposal-type
// pattern rather than making each call site guess which one applies.
export function getProposalDocUrl(title) {
  return getFipProposalUrl(title) ?? getSipProposalUrl(title) ?? getStpProposalUrl(title);
}
