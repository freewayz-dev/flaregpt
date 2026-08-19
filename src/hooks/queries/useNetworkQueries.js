import { useQuery } from "@tanstack/react-query";

import {
  fetchFtsoProviderRankings,
  fetchValidatorRankings,
  fetchValidatorStakes,
} from "@/services/networkService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE, WALLET_QUERY_RESILIENCE } from "@/hooks/queries/resilience";

// Global leaderboards, not wallet-specific — same reasoning as
// useLoopsQueries.js's useGasSniperStatus (no `enabled` gate tied to a
// wallet/auth, confirmed live neither endpoint needs auth). A 60s
// staleTime is enough: these are ranking snapshots, not live-ticking
// values like gas price, so there's no refetchInterval here.
export function useFtsoProviderRankings(limit = 20) {
  return useQuery({
    queryKey: queryKeys.ftso.providerRankings(),
    queryFn: ({ signal }) => fetchFtsoProviderRankings(limit, signal),
    staleTime: 60_000,
    ...QUICK_RESILIENCE,
  });
}

export function useValidatorRankings(limit = 20) {
  return useQuery({
    queryKey: queryKeys.network.validatorRankings(),
    queryFn: ({ signal }) => fetchValidatorRankings(limit, signal),
    staleTime: 60_000,
    ...QUICK_RESILIENCE,
  });
}

// Per-wallet, same shape as useDashboardQueries.js's useFtsoPortfolio —
// `enabled` gates on a real address (works for either a connected wallet
// or a watchlist-only one, since `activeAddress` from useDerivedWalletHub
// already resolves either case the same way every other wallet-scoped
// query in this app does).
export function useValidatorStakes(walletAddress) {
  return useQuery({
    queryKey: queryKeys.network.validatorStakes(walletAddress),
    queryFn: ({ signal }) => fetchValidatorStakes(walletAddress, signal),
    enabled: Boolean(walletAddress),
    ...WALLET_QUERY_RESILIENCE,
  });
}
