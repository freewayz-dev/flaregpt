import { useQuery } from "@tanstack/react-query";

import { fetchFireOverview, fetchFireOverviewV2 } from "@/services/fireService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE } from "@/hooks/queries/resilience";

// Global, no auth, no params — same "not wallet-specific" shape as
// useFtsoProviderRankings. staleTime matches the endpoint's own documented
// 30-minute server-side cache exactly, so this never refetches sooner than
// the data could actually have changed.
export function useFireOverview() {
  return useQuery({
    queryKey: queryKeys.fire.overview(),
    queryFn: ({ signal }) => fetchFireOverview(signal),
    staleTime: 30 * 60_000,
    ...QUICK_RESILIENCE,
  });
}

// Independent of useFireOverview above — Fire/index.jsx calls both side by
// side, not one instead of the other. v1 keeps backing every existing
// stat/table on the page unchanged; this one only ever feeds
// FireTrendChart. staleTime set to v2's shorter *normal* cache window (up
// to 3 minutes, per the handoff doc) rather than v1's 30 — a stale trend
// chart matters less than the headline numbers, but there's no reason to
// hold this one longer than the backend itself promises freshness for.
export function useFireOverviewV2() {
  return useQuery({
    queryKey: queryKeys.fire.overviewV2(),
    queryFn: ({ signal }) => fetchFireOverviewV2(signal),
    staleTime: 3 * 60_000,
    ...QUICK_RESILIENCE,
  });
}
