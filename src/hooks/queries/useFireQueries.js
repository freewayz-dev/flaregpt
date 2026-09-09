import { useQuery } from "@tanstack/react-query";

import { fetchFireOverview } from "@/services/fireService";
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
