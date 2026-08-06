import { useQuery } from "@tanstack/react-query";

import * as rflrService from "@/services/rflrService";
import { queryKeys } from "@/services/queryKeys";
import { QUICK_RESILIENCE, retryUpTo } from "@/hooks/queries/resilience";

// exit-quote is confirmed live to be fast and reliable regardless of wallet
// (well under a second, even for a wallet with no rFLR at all) — a normal
// wallet-scoped resilience profile rides out a genuine transient blip
// without dragging out a real failure.
const EXIT_QUOTE_RESILIENCE = {
  retry: retryUpTo(2),
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8_000),
};

// melt-schedule behaves completely differently: confirmed live to take
// ~30s for any wallet the backend hasn't scanned before (and to
// occasionally 500 on an upstream RPC rate limit during that scan), then
// well under a second for the same wallet afterwards. Multiple retries
// here don't ride out a blip the way they would elsewhere — they mostly
// just re-run the same ~30s cold path and stack up wait time, which is
// exactly the "switching wallets takes forever" complaint this is meant to
// avoid. One retry (for the genuine rate-limit case, which is worth a
// second attempt) with a longer gap — giving the upstream rate limit a
// real chance to clear — rather than three quick ones.
const MELT_SCHEDULE_RESILIENCE = {
  retry: retryUpTo(1),
  retryDelay: 3_000,
};

export function useMeltSchedule(walletAddress: string) {
  return useQuery({
    queryKey: queryKeys.rflr.meltSchedule(walletAddress),
    queryFn: ({ signal }) => rflrService.fetchMeltSchedule(walletAddress, signal),
    enabled: Boolean(walletAddress),
    ...MELT_SCHEDULE_RESILIENCE,
  });
}

export function useExitQuote(walletAddress: string) {
  return useQuery({
    queryKey: queryKeys.rflr.exitQuote(walletAddress),
    queryFn: ({ signal }) => rflrService.fetchExitQuote(walletAddress, signal),
    enabled: Boolean(walletAddress),
    ...EXIT_QUOTE_RESILIENCE,
  });
}

// Global, not wallet-scoped — same 60s staleTime as Dashboard's other
// network-wide stats (market overview, health).
export function useNetworkEmissions() {
  return useQuery({
    queryKey: queryKeys.rflr.networkEmissions(),
    queryFn: ({ signal }) => rflrService.fetchNetworkEmissions(signal),
    staleTime: 60_000,
    ...QUICK_RESILIENCE,
  });
}

export function useNetworkStatus() {
  return useQuery({
    queryKey: queryKeys.rflr.networkStatus(),
    queryFn: ({ signal }) => rflrService.fetchNetworkStatus(signal),
    staleTime: 60_000,
    ...QUICK_RESILIENCE,
  });
}
