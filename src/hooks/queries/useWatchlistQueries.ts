import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as watchlistService from "@/services/watchlistService";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

// `enabled` is the caller's `hasSession` — a guest never has anything to
// fetch here (the endpoint 401s without a session), so the query simply
// never runs rather than firing and failing on every page load. The query
// key itself is scoped by `authenticatedAddress` (see queryKeys.ts's own
// comment) — reading it directly from the store here, rather than adding
// it as a second param, keeps every existing `useWatchlist(hasSession)`
// call site unchanged.
export function useWatchlist(enabled: boolean) {
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useQuery({
    queryKey: queryKeys.watchlist.list(authenticatedAddress),
    queryFn: ({ signal }) => watchlistService.fetchWatchlist(signal),
    enabled,
    staleTime: 30_000,
  });
}

export function useAddWatchlistWallet() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: ({ address, nickname }: { address: string; nickname?: string | null }) =>
      watchlistService.addWatchlistWallet(address, nickname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list(authenticatedAddress) });
    },
  });
}

export function useRemoveWatchlistWallet() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: (address: string) => watchlistService.removeWatchlistWallet(address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list(authenticatedAddress) });
    },
  });
}

export function useUpdateWatchlistWallet() {
  const queryClient = useQueryClient();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  return useMutation({
    mutationFn: ({
      address,
      nickname,
      newAddress,
    }: {
      address: string;
      nickname?: string | null;
      newAddress?: string;
    }) => watchlistService.updateWatchlistWallet(address, { nickname, newAddress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list(authenticatedAddress) });
    },
  });
}
