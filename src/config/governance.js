

import { flare, songbird } from "@/config/web3Config";

// Flare has no dedicated Governance REST API (confirmed: every plausible
// path under api.flaregpt.io/api/v1/governance* 404s live). On-chain
// governance for Flare Improvement Proposals (FIPs), Songbird Improvement
// Proposals (SIPs), and Songbird Test Proposals (STPs) all run through the
// same contract pattern instead — `PollingFoundation`, an OpenZeppelin
// Governor-style contract — read directly, the exact same on-chain-read
// pattern GasSniperCard.tsx already established (wagmi's
// useReadContract/useReadContracts, chain pinned via `chainId`, gated with
// `query.enabled`) rather than a new data-fetching mechanism.
//
// SIP/STP are Songbird-only proposal types (confirmed against Flare's own
// docs and proposals.flare.network's own repository index): SIPs improve
// Songbird only; STPs are Songbird's "try it here before it becomes a FIP"
// mechanism, accepted by default unless enough votes are cast against them.
// There is no separate contract per proposal type — Songbird's
// PollingFoundation holds SIPs and STPs side by side, the same way Flare's
// holds FIPs.



// The *current* PollingFoundation deployment per network — address
// confirmed two ways: (1) live, right now, via `FlareContractRegistry`
// (0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019, the one Flare address
// that's the same on every Flare-family network and the only one Flare's
// own docs say should ever be hardcoded) calling
// `getContractAddressByName("PollingFoundation")` on each chain, and (2)
// against the calldata-signing metadata Flare itself submitted to Ledger's
// public clear-signing registry (github.com/LedgerHQ/clear-signing-erc7730-
// registry, PR #1203, registry/flare/calldata-PollingFoundation-Flare.json)
// for the Flare entry. `getProposalIds()` on each of these currently
// returns FIP-11..16 (Flare) and SIP-05/STP-10..13 (Songbird) — fetched
// live via useGovernanceQueries.ts, never hardcoded here.
export const CURRENT_POLLING = {
  flare: { chainId: flare.id, address: "0xc8294a2335C6c45de827121090ce4Ba9977907D2" },
  songbird: { chainId: songbird.id, address: "0x79Df47237292Dbd1477502CFF3F61cD535B0FAce" },
};

// Read-only subset only — this page displays governance information, it
// does not cast votes. `castVote`/`propose`/`execute`/`cancel` are real
// functions on this contract but are deliberately not included here: an
// on-chain write action like voting needs a genuinely connected wallet and
// its own explicit UX (confirmation, gas, tx status), which is out of
// scope for this page per the task that introduced it.
export const POLLING_FOUNDATION_ABI = [
  {
    type: "function",
    name: "getProposalIds",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    // Real enum order confirmed from IGovernor.sol: Pending, Active,
    // Defeated, Succeeded, Queued, Expired, Executed, Canceled.
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposalInfo",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "_proposer", type: "address" },
      { name: "_accept", type: "bool" },
      { name: "_votePowerBlock", type: "uint256" },
      { name: "_voteStartTime", type: "uint256" },
      { name: "_voteEndTime", type: "uint256" },
      { name: "_execStartTime", type: "uint256" },
      { name: "_execEndTime", type: "uint256" },
      { name: "_thresholdConditionBIPS", type: "uint256" },
      { name: "_majorityConditionBIPS", type: "uint256" },
      { name: "_circulatingSupply", type: "uint256" },
      { name: "_description", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposalVotes",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "_for", type: "uint256" },
      { name: "_against", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_voter", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [
      { name: "_voter", type: "address" },
      { name: "_blockNumber", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

// Deprecated PollingFoundation deployments hold FIP-07..10 (Flare) and
// SIP-01..04/STP-01..09 (Songbird) — confirmed live by finding every
// verified contract literally named "PollingFoundation" on each network's
// own block explorer (flare-explorer/songbird-explorer's
// /api/v2/smart-contracts?q=PollingFoundation), then, for each older one,
// paging its full transaction-log history back to genesis looking for
// `ProposalCreated` events (there is no `getProposalIds()` on these older
// contracts — that convenience method didn't exist yet). This ABI is the
// *older* Solidity 0.7.6 shape (confirmed against each old contract's own
// verified source) — it's missing `_description` entirely; the older
// contract never stored it in read state, only ever emitted it in the
// `ProposalCreated` event at creation time, hence PROPOSAL_CREATED_EVENT
// below.
export const HISTORICAL_POLLING_ABI = [
  {
    type: "function",
    name: "getProposalInfo",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "_proposer", type: "address" },
      { name: "_accept", type: "bool" },
      { name: "_votePowerBlock", type: "uint256" },
      { name: "_voteStartTime", type: "uint256" },
      { name: "_voteEndTime", type: "uint256" },
      { name: "_execStartTime", type: "uint256" },
      { name: "_execEndTime", type: "uint256" },
      { name: "_thresholdConditionBIPS", type: "uint256" },
      { name: "_majorityConditionBIPS", type: "uint256" },
      { name: "_circulatingSupply", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposalVotes",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "_for", type: "uint256" },
      { name: "_against", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
];

// Confirmed against each old contract's own verified ABI (both Songbird
// deployments and the Flare one emit the identical event shape — expected,
// since SIP.01's entire purpose was aligning Songbird's contracts with
// Flare's).
export const PROPOSAL_CREATED_EVENT = {
  type: "event",
  name: "ProposalCreated",
  inputs: [
    { name: "proposalId", type: "uint256", indexed: true },
    { name: "proposer", type: "address", indexed: false },
    { name: "targets", type: "address[]", indexed: false },
    { name: "values", type: "uint256[]", indexed: false },
    { name: "calldatas", type: "bytes[]", indexed: false },
    { name: "description", type: "string", indexed: false },
    { name: "accept", type: "bool", indexed: false },
    { name: "voteTimes", type: "uint256[2]", indexed: false },
    { name: "executionTimes", type: "uint256[2]", indexed: false },
    { name: "votePowerBlock", type: "uint256", indexed: false },
    { name: "thresholdConditionBIPS", type: "uint256", indexed: false },
    { name: "majorityConditionBIPS", type: "uint256", indexed: false },
    { name: "circulatingSupply", type: "uint256", indexed: false },
  ],
};



// Every entry below is an on-chain coordinate (network + contract + real
// proposal id + real block number), not proposal content — titles, vote
// counts, dates, and outcomes are always fetched live from the chain at
// request time (useGovernanceQueries.ts), the same as the current
// contracts. Each id/block pair was independently cross-checked against
// proposals.flare.network's own published proposal id for that FIP/SIP
// where publicly listed (FIP-07, SIP-01, SIP-02 all matched exactly).
export const HISTORICAL_PROPOSALS = [
  // Flare — deprecated PollingFoundation (Solidity 0.7.6, verified
  // 2022-12-28), superseded 2024-09-09 by the current contract above.
  {
    network: "flare",
    chainId: flare.id,
    contractAddress: "0x258E20bdbb2d891521308d2af381B1BD962B67B5",
    id: 72973297397784418527152464822021856775820006809063056756120976518354833053867n, // FIP-07
    blockNumber: 24993033n,
  },
  {
    network: "flare",
    chainId: flare.id,
    contractAddress: "0x258E20bdbb2d891521308d2af381B1BD962B67B5",
    id: 72674715984384929252996842574865832595187106708113970001344533821402192274312n, // FIP-08
    blockNumber: 25327843n,
  },
  {
    network: "flare",
    chainId: flare.id,
    contractAddress: "0x258E20bdbb2d891521308d2af381B1BD962B67B5",
    id: 68580623044064050224071756867140131267540591826868474630961071063472615460402n, // FIP-09
    blockNumber: 26093137n,
  },
  {
    network: "flare",
    chainId: flare.id,
    contractAddress: "0x258E20bdbb2d891521308d2af381B1BD962B67B5",
    id: 58827189422795354977892366773880419531926251745234460754680115962875918456135n, // FIP-10
    blockNumber: 31505694n,
  },
  // Songbird — oldest PollingFoundation (verified 2022-11-29).
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0xE2aFc8465C8Ff5af3BBEa8BBcA5471844D6a14df",
    id: 17709631749656362484960623907102424379139926339425786666562212035285251601698n, // STP-01
    blockNumber: 28413245n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0xE2aFc8465C8Ff5af3BBEa8BBcA5471844D6a14df",
    id: 99877686589051291159439816214444308681891669617969610362053207962914539941917n, // STP-02
    blockNumber: 30880056n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0xE2aFc8465C8Ff5af3BBEa8BBcA5471844D6a14df",
    id: 103532022545436934523427401446964676946623468656052499154170952430975064643615n, // STP-03
    blockNumber: 31823040n,
  },
  // Songbird — second PollingFoundation (verified 2023-02-27, matching
  // SIP.01's own "Created 27-Feb-2023" date), superseded 2024-10-24.
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 87665912177119419850930771002070337111617509938363329917483826669642835249215n, // SIP-01
    blockNumber: 32901045n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 66778465481645690887041505836796293365286885579605118369844165722336569178460n, // STP-04
    blockNumber: 36080707n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 86986707598029556313330355529395772870755361418487059291222730976661664120502n, // STP-05
    blockNumber: 37288783n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 68535016228735825437750592054365271257284277348266129395901601942532869598046n, // SIP-02
    blockNumber: 54022178n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 82514277240463534589368273110530915447147494013795342291494100646671193711544n, // STP-06
    blockNumber: 54022624n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 67891611286238844029510585260290521669085080484578017675206872866625518390282n, // STP-07
    blockNumber: 60863613n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 40055455082342880642274074914243181709056532103430872681892272191633034754038n, // STP-08
    blockNumber: 61456706n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 91362490915358069372375485945298000935668553620268814062836379878618282993076n, // SIP-03
    blockNumber: 65635264n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 89563537990950394808839286241744183822382857868418985395103648546243888827892n, // SIP-04
    blockNumber: 73866709n,
  },
  {
    network: "songbird",
    chainId: songbird.id,
    contractAddress: "0x725cd5E69388515029BCBF9F8aE2cc47f397CD64",
    id: 77930802417508973195664056983481405445677939034169876636214368538582044888932n, // STP-09
    blockNumber: 74125972n,
  },
];
