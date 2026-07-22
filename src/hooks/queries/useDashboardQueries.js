import { useQuery } from "@tanstack/react-query";

import {
  fetchHealth,
  fetchGasPrice,
  fetchMarketOverview,
  fetchWalletBalances,
  fetchFtsoPortfolio,
  fetchFlrPriceHistory,
  fetchFlrOhlc,
} from "@/services/dashboardService";
import { queryKeys } from "@/services/queryKeys";

// A capped retry/backoff for the global (non-wallet-specific) endpoints.
// Without this, the app-wide default (retry: 1 with React Query's default
// up-to-30s backoff) combined with a 15s axios timeout meant a single flaky
// request could sit "loading" for close to a minute before finally
// surfacing an error — which reads as an infinite hang to a user, even
// though it does eventually resolve. Bounding both the retry count and the
// backoff delay makes every card's error+retry UI show up promptly instead.
const QUICK_RESILIENCE = {
  retry: 1,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5_000),
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.health(),
    queryFn: fetchHealth,
    staleTime: 60_000,
    ...QUICK_RESILIENCE,
  });
}

// Gas price and network TPS move frequently, so this polls every 20s to
// feel "live" — components can feed each new value into useLiveSeries to
// build a rolling chart from real, repeated snapshots.
export function useGasPrice() {
  return useQuery({
    queryKey: queryKeys.dashboard.gasPrice(),
    queryFn: fetchGasPrice,
    refetchInterval: 20_000,
    ...QUICK_RESILIENCE,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.marketOverview(),
    queryFn: fetchMarketOverview,
    refetchInterval: 60_000,
    ...QUICK_RESILIENCE,
  });
}

// These two hit a wallet-specific endpoint that's more exposed to transient
// network blips than the global stats endpoints (per-request work, not
// cached upstream). 3 retries with exponential backoff rides out a brief
// blip automatically; the card itself still offers a manual retry button
// for when the network is genuinely down for longer than that.
const WALLET_QUERY_RESILIENCE = {
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
};

export function useWalletBalances(walletAddress) {
  return useQuery({
    queryKey: queryKeys.dashboard.walletBalances(walletAddress),
    queryFn: () => fetchWalletBalances(walletAddress),
    enabled: Boolean(walletAddress),
    ...WALLET_QUERY_RESILIENCE,
  });
}

export function useFtsoPortfolio(walletAddress) {
  return useQuery({
    queryKey: queryKeys.dashboard.ftsoPortfolio(walletAddress),
    queryFn: () => fetchFtsoPortfolio(walletAddress),
    enabled: Boolean(walletAddress),
    ...WALLET_QUERY_RESILIENCE,
  });
}

export function useFlrPriceHistory(days) {
  return useQuery({
    queryKey: queryKeys.dashboard.flrPriceHistory(days),
    queryFn: () => fetchFlrPriceHistory(days),
    staleTime: 5 * 60_000,
  });
}

export function useFlrOhlc(days) {
  return useQuery({
    queryKey: queryKeys.dashboard.flrOhlc(days),
    queryFn: () => fetchFlrOhlc(days),
    staleTime: 5 * 60_000,
  });
}
