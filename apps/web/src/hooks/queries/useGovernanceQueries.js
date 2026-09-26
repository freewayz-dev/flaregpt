import { useMemo } from "react";
import { useReadContract, useReadContracts, useBlockNumber, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { zeroAddress} from "viem";

import {
  CURRENT_POLLING,
  POLLING_FOUNDATION_ABI,
  HISTORICAL_POLLING_ABI,
  HISTORICAL_PROPOSALS,
  PROPOSAL_CREATED_EVENT} from "@/config/governance";
import { queryKeys } from "@/services/queryKeys";
import {
  buildProposal} from "@/pages/Governance/utils/deriveGovernance";

// This app has no dedicated Governance REST API — every read here goes
// straight to the relevant network's PollingFoundation contract via the
// exact same on-chain-read pattern GasSniperCard.tsx already established
// (wagmi's useReadContract/useReadContracts, chain pinned via `chainId`,
// gated with `query.enabled`) rather than a new data-fetching mechanism.
// `useReadContracts` targets Flare/Songbird, neither of which has
// multicall3 deployed in this app's wagmi config — wagmi's own
// readContracts action automatically falls back to parallel individual
// eth_calls in that case (see @wagmi/core/actions/readContracts.ts), so
// this still resolves in one round-trip's worth of latency without needing
// multicall wiring.

export function useProposalIds(network) {
  const { chainId, address } = CURRENT_POLLING[network];
  return useReadContract({
    address,
    abi: POLLING_FOUNDATION_ABI,
    functionName: "getProposalIds",
    chainId,
  });
}

// Fetches info + votes + state for every *current-contract* proposal id and
// shapes the raw tuples into the app's own `Proposal` domain type
// (deriveGovernance.ts). Public, wallet-independent data — this is exactly
// the "same public governance information for a watchlist wallet as a
// connected one" requirement, since none of these reads take a wallet's own
// address. Historical (deprecated-contract) proposals are a separate hook —
// see useHistoricalProposals below — since they need a different ABI and
// have no ids to enumerate in the first place.
export function useProposals(network, ids) {
  const { chainId, address } = CURRENT_POLLING[network];

  const contracts = useMemo(() => {
    if (!ids || ids.length === 0) return [];
    return ids.flatMap(
      (id) =>
        [
          {
            address,
            abi: POLLING_FOUNDATION_ABI,
            functionName: "getProposalInfo",
            args: [id],
            chainId,
          },
          {
            address,
            abi: POLLING_FOUNDATION_ABI,
            functionName: "getProposalVotes",
            args: [id],
            chainId,
          },
          {
            address,
            abi: POLLING_FOUNDATION_ABI,
            functionName: "state",
            args: [id],
            chainId,
          },
        ],
    );
  }, [ids, address, chainId]);

  const query = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  // A proposal only makes it into the final list once all three of its
  // reads succeed — a single reverted/failed call (e.g. a transient RPC
  // hiccup on just one of the parallel requests) drops that one proposal
  // rather than corrupting it with undefined fields, matching
  // `allowFailure`'s default per-call (not all-or-nothing) failure mode.
  const proposals = useMemo(() => {
    if (!ids || ids.length === 0 || !query.data) return undefined;
    const result = [];
    for (let i = 0; i < ids.length; i++) {
      const info = query.data[i * 3];
      const votes = query.data[i * 3 + 1];
      const state = query.data[i * 3 + 2];
      if (info?.status !== "success" || votes?.status !== "success" || state?.status !== "success") {
        continue;
      }
      // `contracts` is built at runtime via `flatMap`, not a `const`
      // literal tuple, so wagmi can't carry positional types through the
      // flattened array — each result's `.result` type-checks as the
      // union of all three possible shapes at every index. The status
      // checks above are the real runtime guarantee of shape; this cast
      // just tells TypeScript what's already been verified.
      result.push(
        buildProposal(
          ids[i],
          info.result,
          votes.result,
          state.result,
          network,
          false,
        ),
      );
    }
    return result;
  }, [ids, query.data, network]);

  // `allowFailure` (wagmi's default) means the overall query can report
  // `isSuccess: true` even when every single per-proposal read failed —
  // "no proposals" and "the RPC couldn't answer" would otherwise look
  // identical to the empty-history state, silently under-reporting real
  // on-chain history instead of surfacing it as a real, retryable error.
  // `getProposalIds()` is the source of truth for how many proposals
  // genuinely exist; a resolved list shorter than that is never a
  // legitimate "there are fewer proposals than there actually are."
  const isIncomplete = Boolean(query.isSuccess && ids && proposals && proposals.length < ids.length);

  return { ...query, proposals, isIncomplete };
}

// Deprecated-contract proposals — FIP-07..10 (Flare), SIP-01..04/STP-01..09
// (Songbird). Unlike useProposals above, these never enumerate ids at
// runtime: the older contracts have no getProposalIds() (confirmed live —
// it reverts), so HISTORICAL_PROPOSALS in config/governance.ts is the
// fixed, real, independently-verified list of which ids exist and which
// deprecated contract holds each one. Everything about a historical
// proposal's actual content — vote counts, dates, accept/reject, and title
// — is still fetched live from the chain here, never hardcoded.
export function useHistoricalProposals(network) {
  const { chainId } = CURRENT_POLLING[network];
  const client = usePublicClient({ chainId });

  const refs = useMemo(
    () => HISTORICAL_PROPOSALS.filter((ref) => ref.network === network),
    [network],
  );

  const contracts = useMemo(
    () =>
      refs.flatMap(
        (ref) =>
          [
            {
              address: ref.contractAddress,
              abi: HISTORICAL_POLLING_ABI,
              functionName: "getProposalInfo",
              args: [ref.id],
              chainId: ref.chainId,
            },
            {
              address: ref.contractAddress,
              abi: HISTORICAL_POLLING_ABI,
              functionName: "getProposalVotes",
              args: [ref.id],
              chainId: ref.chainId,
            },
            {
              address: ref.contractAddress,
              abi: HISTORICAL_POLLING_ABI,
              functionName: "state",
              args: [ref.id],
              chainId: ref.chainId,
            },
          ],
      ),
    [refs],
  );

  const infoQuery = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  // The deprecated contracts never stored a description in read state
  // (confirmed against each one's own verified source) — only emitted it
  // once, in the `ProposalCreated` event at creation time. Flare's public
  // RPCs cap eth_getLogs at a 30-block range per call (confirmed live),
  // far too narrow to search for an unknown event — but each ref's
  // `blockNumber` (independently confirmed by paging every deprecated
  // contract's full log history back to genesis) makes this a single-block
  // lookup, well within that limit.
  const titlesQuery = useQuery({
    queryKey: queryKeys.governance.historicalTitle(
      chainId,
      network,
      refs.map((ref) => ref.id.toString()).join(","),
    ),
    queryFn: async () => {
      if (!client) return new Map();
      const entries = await Promise.all(
        refs.map(async (ref) => {
          const logs = await client.getLogs({
            address: ref.contractAddress,
            event: PROPOSAL_CREATED_EVENT,
            args: { proposalId: ref.id },
            fromBlock: ref.blockNumber,
            toBlock: ref.blockNumber,
          });
          const description = logs[0]?.args.description ?? "";
          return [ref.id.toString(), description];
        }),
      );
      return new Map(entries);
    },
    enabled: refs.length > 0 && Boolean(client),
    // Real, mined on-chain history never changes — no reason to ever
    // refetch this within a session.
    staleTime: Infinity,
  });

  const proposals = useMemo(() => {
    if (refs.length === 0) return [];
    if (!infoQuery.data || !titlesQuery.data) return undefined;
    const result = [];
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const info = infoQuery.data[i * 3];
      const votes = infoQuery.data[i * 3 + 1];
      const state = infoQuery.data[i * 3 + 2];
      if (info?.status !== "success" || votes?.status !== "success" || state?.status !== "success") {
        continue;
      }
      const title = titlesQuery.data.get(ref.id.toString()) ?? "";
      result.push(
        buildProposal(
          ref.id,
          info.result,
          votes.result,
          state.result,
          network,
          true,
          title,
        ),
      );
    }
    return result;
  }, [refs, infoQuery.data, titlesQuery.data, network]);

  return {
    proposals,
    isLoading: (contracts.length > 0 && infoQuery.isLoading) || (refs.length > 0 && titlesQuery.isLoading),
    isError: infoQuery.isError || titlesQuery.isError,
    isFetching: infoQuery.isFetching || titlesQuery.isFetching,
    refetch: () => {
      infoQuery.refetch();
      titlesQuery.refetch();
    },
  };
}

// Whether `activeAddress` has voted on each proposal — the one piece of
// per-wallet governance data this page shows, and it works identically for
// a watchlist wallet or a connected one (hasVoted takes any address, no
// signature or connection required to read it). Current-contract proposals
// only — a wallet's vote on a deprecated contract's proposal isn't
// meaningful to surface here, since that contract predates most wallets'
// engagement with this page.
export function useUserHasVoted(
  network,
  activeAddress,
  ids,
) {
  const { chainId, address } = CURRENT_POLLING[network];

  const contracts = useMemo(() => {
    if (!ids || ids.length === 0 || !activeAddress) return [];
    return ids.map(
      (id) =>
        ({
          address,
          abi: POLLING_FOUNDATION_ABI,
          functionName: "hasVoted",
          args: [id, activeAddress],
          chainId,
        }),
    );
  }, [ids, activeAddress, address, chainId]);

  const query = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const hasVotedById = useMemo(() => {
    const map = new Map();
    if (!ids || !query.data) return map;
    ids.forEach((id, i) => {
      const r = query.data?.[i];
      if (r?.status === "success") map.set(id.toString(), r.result);
    });
    return map;
  }, [ids, query.data]);

  return { ...query, hasVotedById };
}

// A wallet's voting power at a specific block — used two ways: the
// current block for a live "your voting power right now" stat, and a
// specific proposal's `votePowerBlock` (its real snapshot block) for
// "your voting power at the time this proposal was decided," fetched only
// when that proposal's detail drawer is actually opened rather than
// upfront for every proposal.
export function useVotesAtBlock(
  network,
  activeAddress,
  blockNumber,
) {
  const { chainId, address } = CURRENT_POLLING[network];
  return useReadContract({
    address,
    abi: POLLING_FOUNDATION_ABI,
    functionName: "getVotes",
    args: [activeAddress ?? zeroAddress, blockNumber ?? 0n],
    chainId,
    query: { enabled: Boolean(activeAddress) && blockNumber !== undefined },
  });
}

export function useCurrentVotingPower(network, activeAddress) {
  const { chainId } = CURRENT_POLLING[network];
  const { data: blockNumber } = useBlockNumber({
    chainId,
    query: { enabled: Boolean(activeAddress) },
  });
  return useVotesAtBlock(network, activeAddress, blockNumber);
}
