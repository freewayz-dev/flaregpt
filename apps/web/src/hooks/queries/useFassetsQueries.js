import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchFassetsOverview, fetchFassetsAgents } from "@/services/fassetsService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE } from "@/hooks/queries/resilience";

// Global, no auth, no params — same "not wallet-specific" shape as
// useFireOverview. staleTime matches the endpoint's own FlareMetrics-backed
// refresh cadence (same 30-minute window Fire's own overview uses) rather
// than trusting react-query's default, so this never refetches sooner than
// the data could actually have changed.
export function useFassetsOverview() {
  return useQuery({
    queryKey: queryKeys.fassets.overview(),
    queryFn: ({ signal }) => fetchFassetsOverview(signal),
    staleTime: 30 * 60_000,
    ...QUICK_RESILIENCE,
  });
}

// Fully on-chain, re-queried whenever `sort` changes (a real server-side
// param, not a client-side re-sort of one cached list — see
// fassetsService.js) — each sort value is its own cache entry via
// queryKeys.fassets.agents(sort), so flipping between sort options and back
// re-shows the earlier result instantly without a second fetch.
//
// `placeholderData: keepPreviousData` is what actually keeps the table from
// jumping when a sort option is clicked: without it, `data` goes back to
// `undefined` the instant the query key changes, so AgentsTable would
// unmount its real table into a differently-shaped skeleton and back on
// every click — a structural jump, not just a width one. With it, the
// previous sort's rows stay rendered (and `isFetching` still flips true)
// until the new sort's response actually lands, so only the row contents
// swap, never the surrounding structure.
export function useFassetsAgents(sort) {
  return useQuery({
    queryKey: queryKeys.fassets.agents(sort),
    queryFn: ({ signal }) => fetchFassetsAgents(sort, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    ...QUICK_RESILIENCE,
  });
}
