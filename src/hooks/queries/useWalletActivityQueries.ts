import { useQuery } from "@tanstack/react-query";

import { fetchWalletActivity } from "@/services/walletActivityService";
import { queryKeys } from "@/services/queryKeys";
import { retryUpTo } from "@/hooks/queries/resilience";

// Deliberately not the shared WALLET_QUERY_RESILIENCE (3 retries, backoff
// capped at 10s) every other wallet-scoped hook uses — that's tuned for
// fast endpoints riding out a brief network blip. Retrying a request that
// can legitimately take minutes, 3 times, with backoff on top, risks
// turning one slow load into a much longer one. A single retry still
// covers a genuine transient drop; anything past that surfaces the error +
// manual retry button rather than silently compounding the wait.
const LARGE_HISTORY_RESILIENCE = {
  retry: retryUpTo(1),
  retryDelay: 3_000,
};

// R2: once a wallet's activity has been fetched, it's effectively
// immutable history (new transactions only ever append at the tip) — so
// `staleTime: Infinity` means visiting this page again this session never
// re-pays the multi-minute cost. `gcTime: Infinity` keeps it cached even if
// every component reading it unmounts. Refresh is manual only (see the
// page's own refetch button) — never silent/automatic, given what a
// mistaken auto-refetch would cost here.
//
// Note what's *not* here: no `signal` is threaded from the queryFn's
// AbortController into the actual request (see fetchWalletActivity) — that
// omission is deliberate, not an oversight, so navigating away from this
// page mid-fetch doesn't cancel it (R15's "keep indexing in the
// background" behavior — see useWalletActivityNotifier).
export function useWalletActivity(walletAddress: string) {
  return useQuery({
    queryKey: queryKeys.walletActivity.activity(walletAddress),
    queryFn: () => fetchWalletActivity(walletAddress),
    enabled: Boolean(walletAddress),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...LARGE_HISTORY_RESILIENCE,
  });
}
