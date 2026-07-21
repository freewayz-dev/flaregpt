import { useQuery } from "@tanstack/react-query";

import {
  fetchMarketStats,
  fetchRecentActivity,
  fetchHoldings,
} from "@/services/dashboardService";
import { queryKeys } from "@/services/queryKeys";

export function useMarketStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: fetchMarketStats,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: fetchRecentActivity,
  });
}

export function useHoldings() {
  return useQuery({
    queryKey: queryKeys.dashboard.holdings(),
    queryFn: fetchHoldings,
  });
}
