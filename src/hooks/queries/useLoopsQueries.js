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
// `setQueryData` with the outcome this mutation already knows happened,
// *then* `invalidateQueries` for eventual consistency — not invalidate
// alone. Invalidate-then-refetch is a real network round trip, which
// means there's a window where something else racing to refetch this same
// query (this app's QueryClient defaults every query to
// `refetchOnWindowFocus: true` — see main.jsx) can land its own response
// in between, out of order, and overwrite the toggle's own outcome with
// stale data — read by the toggle as "the click did nothing," recovering
// only once a second click (or the next refetch) happens to land cleanly.
// Setting the known outcome directly makes the UI correct immediately and
// deterministically, independent of whatever else might also be
// refetching this query at the same time; the invalidate afterward still
// reconciles with the backend's own source of truth shortly after.
export function useEnableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress) => loopsService.enableGasSniper(walletAddress),
    onSuccess: (_data, walletAddress) => {
      queryClient.setQueryData(queryKeys.loops.gasSniperStatus(), (old) => {
        if (!old) return old;
        const alreadyOptedIn = old.opted_in_wallets?.some(
          (w) => w.toLowerCase() === walletAddress.toLowerCase(),
        );
        if (alreadyOptedIn) return old;
        return { ...old, opted_in_wallets: [...(old.opted_in_wallets ?? []), walletAddress] };
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}

export function useDisableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress) => loopsService.disableGasSniper(walletAddress),
    onSuccess: (_data, walletAddress) => {
      queryClient.setQueryData(queryKeys.loops.gasSniperStatus(), (old) => {
        if (!old) return old;
        return {
          ...old,
          opted_in_wallets: (old.opted_in_wallets ?? []).filter(
            (w) => w.toLowerCase() !== walletAddress.toLowerCase(),
          ),
        };
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}
