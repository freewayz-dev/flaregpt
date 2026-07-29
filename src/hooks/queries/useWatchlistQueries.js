import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as watchlistService from "@/services/watchlistService";
import { queryKeys } from "@/services/queryKeys";

// `enabled` is the caller's `hasSession` — a guest never has anything to
// fetch here (the endpoint 401s without a session), so the query simply
// never runs rather than firing and failing on every page load.
export function useWatchlist(enabled) {
  return useQuery({
    queryKey: queryKeys.watchlist.list(),
    queryFn: watchlistService.fetchWatchlist,
    enabled,
    staleTime: 30_000,
  });
}

export function useAddWatchlistWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ address, nickname }) =>
      watchlistService.addWatchlistWallet(address, nickname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

export function useRemoveWatchlistWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (address) => watchlistService.removeWatchlistWallet(address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}

export function useUpdateWatchlistWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ address, nickname, newAddress }) =>
      watchlistService.updateWatchlistWallet(address, { nickname, newAddress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
    },
  });
}
