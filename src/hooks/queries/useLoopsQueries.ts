import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as loopsService from "@/services/loopsService";
import { queryKeys } from "@/services/queryKeys";

// No `enabled` gate tied to auth the way useConversations/useWatchlist are
// — confirmed live this endpoint needs no auth at all (it's a global dry-
// run view), so a guest can still see the same status anyone else would.
export function useGasSniperStatus() {
  return useQuery({
    queryKey: queryKeys.loops.gasSniperStatus(),
    queryFn: ({ signal }) => loopsService.fetchGasSniperStatus(signal),
    staleTime: 15_000,
  });
}

// `onSuccess` returning (not just firing) `invalidateQueries()` is load-
// bearing, not stylistic: TanStack Query's mutation lifecycle only settles
// `mutate`/`mutateAsync`'s own promise once every `onSuccess` callback has
// itself resolved — so returning this promise is what makes
// `mutateAsync()` in GasSniperCard.tsx actually wait for the *status* query
// to finish refetching, not just for the enable/disable POST to succeed.
// Without the `return` (the original bug here), `invalidateQueries()` still
// runs, but as an un-awaited fire-and-forget: `mutateAsync()` resolved as
// soon as the POST itself succeeded, so `handleToggle`'s success toast fired
// while `useGasSniperStatus()`'s cached data — the toggle's actual
// `checked` source — was still the pre-toggle value. The toggle only
// caught up once that background refetch happened to land on its own,
// which read as "the toggle needs a second click to take effect" even
// though the backend had already applied the change on the first one.
export function useEnableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress: string) => loopsService.enableGasSniper(walletAddress),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}

export function useDisableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress: string) => loopsService.disableGasSniper(walletAddress),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}
