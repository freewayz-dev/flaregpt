import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as loopsService from "@/services/loopsService";
import { queryKeys } from "@/services/queryKeys";

// No `enabled` gate tied to auth the way useConversations/useWatchlist are
// — confirmed live this endpoint needs no auth at all (it's a global dry-
// run view), so a guest can still see the same status anyone else would.
export function useGasSniperStatus() {
  return useQuery({
    queryKey: queryKeys.loops.gasSniperStatus(),
    queryFn: loopsService.fetchGasSniperStatus,
    staleTime: 15_000,
  });
}

export function useEnableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress) => loopsService.enableGasSniper(walletAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}

export function useDisableGasSniper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletAddress) => loopsService.disableGasSniper(walletAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loops.gasSniperStatus() });
    },
  });
}
