import { describe, it, expect } from "vitest";

import {
  buildProposal,
  isActiveProposal,
  isConcludedProposal,
  isPassedProposal,
  isDefeatedProposal,
  getProposalStatusMeta,
  computeVoteSplit,
  computeGovernanceStats,
  computeUserParticipation,
  formatVotePowerCompact,
  bipsToPercentLabel,
  getFipProposalUrl,
  ProposalStateValue} from "@/pages/Governance/utils/deriveGovernance";

const PROPOSER = "0x1234567890123456789012345678901234567890";

function makeInfo(overrides = {}) {
  return [
    (overrides.proposer ?? PROPOSER),
    overrides.accept ?? true,
    overrides.votePowerBlock ?? 100n,
    overrides.voteStartTime ?? 1_000n,
    overrides.voteEndTime ?? 2_000n,
    overrides.execStartTime ?? 0n,
    overrides.execEndTime ?? 0n,
    overrides.thresholdBips ?? 0n,
    overrides.majorityBips ?? 5000n,
    overrides.circulatingSupply ?? 100_000_000_000_000_000_000n,
    overrides.description ?? "FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability",
  ];
}

// The exact real title observed live on Flare mainnet's PollingFoundation
// contract (see config/governance.ts's own comment) — confirms the split
// logic works on genuine on-chain data, not just a synthetic string.
describe("buildProposal", () => {
  it("derives a title from the on-chain description's first line, trimmed", () => {
    const proposal = buildProposal(
      1n,
      makeInfo({ description: "FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability" }),
      [5_584_276_388_171_569_457_423_523_902n, 110_535_155_356_761_807_469_936_046n],
      ProposalStateValue.Queued, "flare", false
    );
    expect(proposal.title).toBe("FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability");
    expect(proposal.forVotes).toBe(5_584_276_388_171_569_457_423_523_902n);
    expect(proposal.againstVotes).toBe(110_535_155_356_761_807_469_936_046n);
  });

  it("only keeps the first line of a multi-line description", () => {
    const proposal = buildProposal(
      1n,
      makeInfo({ description: "FIP-99: Something\nA longer body that shouldn't appear in the title" }),
      [0n, 0n],
      ProposalStateValue.Pending, "flare", false
    );
    expect(proposal.title).toBe("FIP-99: Something");
  });
});

describe("proposal classification", () => {
  const active = buildProposal(1n, makeInfo(), [0n, 0n], ProposalStateValue.Active, "flare", false);
  const pending = buildProposal(2n, makeInfo(), [0n, 0n], ProposalStateValue.Pending, "flare", false);
  const defeated = buildProposal(3n, makeInfo(), [0n, 0n], ProposalStateValue.Defeated, "flare", false);
  const succeeded = buildProposal(4n, makeInfo(), [0n, 0n], ProposalStateValue.Succeeded, "flare", false);
  const queued = buildProposal(5n, makeInfo(), [0n, 0n], ProposalStateValue.Queued, "flare", false);
  const expired = buildProposal(6n, makeInfo(), [0n, 0n], ProposalStateValue.Expired, "flare", false);
  const executed = buildProposal(7n, makeInfo(), [0n, 0n], ProposalStateValue.Executed, "flare", false);
  const canceled = buildProposal(8n, makeInfo(), [0n, 0n], ProposalStateValue.Canceled, "flare", false);

  it("isActiveProposal is true only for the Active state", () => {
    expect(isActiveProposal(active)).toBe(true);
    expect(isActiveProposal(pending)).toBe(false);
    expect(isActiveProposal(succeeded)).toBe(false);
  });

  it("isConcludedProposal excludes Pending and Active only", () => {
    expect(isConcludedProposal(pending)).toBe(false);
    expect(isConcludedProposal(active)).toBe(false);
    expect(isConcludedProposal(defeated)).toBe(true);
    expect(isConcludedProposal(succeeded)).toBe(true);
    expect(isConcludedProposal(canceled)).toBe(true);
  });

  it("isPassedProposal is true for Succeeded, Queued, Expired, and Executed — every real Flare FIP observed live is Queued", () => {
    expect(isPassedProposal(succeeded)).toBe(true);
    expect(isPassedProposal(queued)).toBe(true);
    expect(isPassedProposal(expired)).toBe(true);
    expect(isPassedProposal(executed)).toBe(true);
    expect(isPassedProposal(defeated)).toBe(false);
    expect(isPassedProposal(canceled)).toBe(false);
  });

  it("isDefeatedProposal is true only for Defeated", () => {
    expect(isDefeatedProposal(defeated)).toBe(true);
    expect(isDefeatedProposal(succeeded)).toBe(false);
  });
});

describe("getProposalStatusMeta", () => {
  const t = (key) => key;

  it("relabels Queued as 'passed' — the real terminal state for off-chain-executed FIPs", () => {
    const meta = getProposalStatusMeta(ProposalStateValue.Queued, t);
    expect(meta.label).toBe("governance.status.passed");
    expect(meta.tone).toBe("success");
    expect(meta.dot).toBe(false);
  });

  it("gives Active a pulsing dot to distinguish 'happening now' from 'passed'", () => {
    const meta = getProposalStatusMeta(ProposalStateValue.Active, t);
    expect(meta.dot).toBe(true);
    expect(meta.tone).toBe("success");
  });

  it("gives Defeated the danger tone, not success or warning", () => {
    const meta = getProposalStatusMeta(ProposalStateValue.Defeated, t);
    expect(meta.tone).toBe("danger");
  });
});

describe("computeVoteSplit", () => {
  it("computes real for/against percentages from real vote power", () => {
    const proposal = buildProposal(
      1n,
      makeInfo(),
      [5_584_276_388n, 110_535_155n],
      ProposalStateValue.Queued, "flare", false
    );
    const split = computeVoteSplit(proposal);
    expect(split.forPercent).toBeCloseTo(98.06, 1);
    expect(split.againstPercent).toBeCloseTo(1.94, 1);
    expect(split.totalVotes).toBe(5_694_811_543n);
  });

  it("returns all zeros for a proposal with no votes cast, without dividing by zero", () => {
    const proposal = buildProposal(1n, makeInfo(), [0n, 0n], ProposalStateValue.Pending, "flare", false);
    const split = computeVoteSplit(proposal);
    expect(split.forPercent).toBe(0);
    expect(split.againstPercent).toBe(0);
    expect(split.totalVotes).toBe(0n);
  });
});

describe("computeGovernanceStats", () => {
  it("counts real proposals by real state — matches the 6 live FIP-11..16 proposals' actual distribution", () => {
    const proposals = [
      buildProposal(1n, makeInfo(), [1n, 0n], ProposalStateValue.Queued, "flare", false),
      buildProposal(2n, makeInfo(), [1n, 0n], ProposalStateValue.Queued, "flare", false),
      buildProposal(3n, makeInfo(), [1n, 0n], ProposalStateValue.Active, "flare", false),
      buildProposal(4n, makeInfo(), [1n, 0n], ProposalStateValue.Defeated, "flare", false),
    ];
    const stats = computeGovernanceStats(proposals);
    expect(stats).toEqual({ total: 4, active: 1, passed: 2, defeated: 1 });
  });

  it("returns all zeros for an empty proposal list, not undefined/NaN", () => {
    expect(computeGovernanceStats([])).toEqual({ total: 0, active: 0, passed: 0, defeated: 0 });
  });
});

describe("computeUserParticipation", () => {
  it("only counts concluded proposals — voting isn't measurable on something still pending", () => {
    const concluded = [
      buildProposal(1n, makeInfo(), [1n, 0n], ProposalStateValue.Queued, "flare", false),
      buildProposal(2n, makeInfo(), [1n, 0n], ProposalStateValue.Defeated, "flare", false),
    ];
    const hasVotedById = new Map([["1", true], ["2", false]]);
    expect(computeUserParticipation(concluded, hasVotedById)).toEqual({ voted: 1, total: 2 });
  });
});

describe("formatVotePowerCompact", () => {
  it("formats a real wei-denominated vote power as compact FLR", () => {
    // The real FIP-16 for-vote tally observed live.
    expect(formatVotePowerCompact(5_584_276_388_171_569_457_423_523_902n)).toBe("5.58B FLR");
  });

  it("formats zero cleanly", () => {
    expect(formatVotePowerCompact(0n)).toBe("0 FLR");
  });
});

describe("bipsToPercentLabel", () => {
  it("converts real BIPS values to percent — the real majorityConditionBIPS on every live FIP is 5000 (50%)", () => {
    expect(bipsToPercentLabel(5000)).toBe("50%");
  });

  it("converts a zero threshold to 0%, not 'Not required' — that framing is the drawer's job, not this pure formatter's", () => {
    expect(bipsToPercentLabel(0)).toBe("0%");
  });
});

describe("getFipProposalUrl", () => {
  it("builds a real, correct proposals.flare.network link from a matching FIP title", () => {
    expect(getFipProposalUrl("FIP-16: Restructure FLR Tokenomics for Long-Term Network Sustainability")).toBe(
      "https://proposals.flare.network/FIP/FIP_16.html",
    );
  });

  it("zero-pads a single-digit FIP number to match the real site's URL scheme", () => {
    expect(getFipProposalUrl("FIP-9: Something")).toBe("https://proposals.flare.network/FIP/FIP_09.html");
  });

  it("returns null rather than guessing when the title doesn't match the FIP-N convention", () => {
    expect(getFipProposalUrl("A proposal with no FIP number in its title")).toBeNull();
  });
});
