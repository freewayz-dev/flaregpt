import { useQuery } from "@tanstack/react-query";

import { fetchLinks, fetchLinkCategories } from "@/services/linksService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE } from "@/hooks/queries/resilience";

// Global, unauthenticated reference data — `category` (undefined = "all")
// is a real server-side filter, so it's part of the query key.
export function useLinks(category) {
  return useQuery({
    queryKey: queryKeys.links.list(category),
    queryFn: ({ signal }) => fetchLinks(category, signal),
    staleTime: 5 * 60_000,
    ...QUICK_RESILIENCE,
  });
}

export function useLinkCategories() {
  return useQuery({
    queryKey: queryKeys.links.categories(),
    queryFn: ({ signal }) => fetchLinkCategories(signal),
    staleTime: 5 * 60_000,
    ...QUICK_RESILIENCE,
  });
}
