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
import { QUICK_RESILIENCE, WALLET_QUERY_RESILIENCE, retryUpTo } from "@/hooks/queries/resilience";

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.health(),
    queryFn: ({ signal }) => fetchHealth(signal),
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
    queryFn: ({ signal }) => fetchGasPrice(signal),
    refetchInterval: 20_000,
    ...QUICK_RESILIENCE,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.marketOverview(),
    queryFn: ({ signal }) => fetchMarketOverview(signal),
    refetchInterval: 60_000,
    ...QUICK_RESILIENCE,
  });
}

export function useWalletBalances(walletAddress) {
  return useQuery({
    queryKey: queryKeys.dashboard.walletBalances(walletAddress),
    queryFn: ({ signal }) => fetchWalletBalances(walletAddress, signal),
    enabled: Boolean(walletAddress),
    ...WALLET_QUERY_RESILIENCE,
  });
}

export function useFtsoPortfolio(walletAddress) {
  return useQuery({
    queryKey: queryKeys.dashboard.ftsoPortfolio(walletAddress),
    queryFn: ({ signal }) => fetchFtsoPortfolio(walletAddress, signal),
    enabled: Boolean(walletAddress),
    ...WALLET_QUERY_RESILIENCE,
  });
}

// CoinGecko's public API (no key, shared rate-limit pool across everyone
// using it anonymously) returns 429 when that limit is hit — common enough
// in practice to design for explicitly rather than treat as exceptional.
// `retryUpTo` already treats 429 as retryable and a definitive 4xx like 404
// as not, which is exactly this endpoint's shape; only the backoff timing
// differs from the shared profiles (CoinGecko's rate limit window is wider).
const COINGECKO_RESILIENCE = {
  retry: retryUpTo(2),
  retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15_000),
};

export function useFlrPriceHistory(days) {
  return useQuery({
    queryKey: queryKeys.dashboard.flrPriceHistory(days),
    queryFn: ({ signal }) => fetchFlrPriceHistory(days, signal),
    staleTime: 5 * 60_000,
    ...COINGECKO_RESILIENCE,
  });
}

export function useFlrOhlc(days) {
  return useQuery({
    queryKey: queryKeys.dashboard.flrOhlc(days),
    queryFn: ({ signal }) => fetchFlrOhlc(days, signal),
    staleTime: 5 * 60_000,
    ...COINGECKO_RESILIENCE,
  });
}
