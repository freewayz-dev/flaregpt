import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  fetchMxrpyVault,
  fetchSceptreVault,
  fetchFirelightVault,
  fetchSpectraVault,
  fetchCompareStrategies,
} from "@/services/defiProtocolsService";
import { queryKeys } from "@/services/queryKeys";

// Matches the resilience profile useDashboardQueries.js uses for
// wallet-specific endpoints: these are per-request (not upstream-cached), so
// a few retries with backoff rides out a brief blip automatically, while
// each card still offers a manual retry button for a longer outage.
const WALLET_QUERY_RESILIENCE = {
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
};

// `enabled` defaults to true (any existing caller keeps fetching as soon as
// a wallet is known) but callers that only need this protocol's data under
// some other condition — e.g. ProtocolExplorer only wants the currently
// selected protocol's vault to actually hit the network — can pass
// `enabled: false` to keep the query idle while still subscribing to
// whatever another component's identical query key has already cached.
export function useMxrpyVault(walletAddress, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.defiProtocols.vaults("mxrpy", walletAddress),
    queryFn: () => fetchMxrpyVault(walletAddress),
    enabled: Boolean(walletAddress) && enabled,
    ...WALLET_QUERY_RESILIENCE,
  });
}

export function useSceptreVault(walletAddress, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.defiProtocols.vaults("sceptre", walletAddress),
    queryFn: () => fetchSceptreVault(walletAddress),
    enabled: Boolean(walletAddress) && enabled,
    ...WALLET_QUERY_RESILIENCE,
  });
}

export function useFirelightVault(walletAddress, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.defiProtocols.vaults("firelight", walletAddress),
    queryFn: () => fetchFirelightVault(walletAddress),
    enabled: Boolean(walletAddress) && enabled,
    ...WALLET_QUERY_RESILIENCE,
  });
}

// Not wallet-gated like the other three vaults above — `user_wallet` is
// genuinely optional server-side (confirmed live: omitting it still
// returns full global market data, just with `user_position: null`), so
// there's real value in showing a market's maturity/supply info before
// anyone's connected anything. Gated on `market` instead, since that's the
// one param this endpoint actually needs to return something scoped.
export function useSpectraVault(walletAddress, market, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.defiProtocols.spectraVault(market, walletAddress),
    queryFn: () => fetchSpectraVault(walletAddress, market),
    enabled: Boolean(market) && enabled,
    ...WALLET_QUERY_RESILIENCE,
  });
}

// Not wallet-gated — this endpoint compares strategies for a hypothetical
// principal, not a connected wallet's actual holdings, and works the same
// whether or not anyone is connected.
const QUICK_RESILIENCE = {
  retry: 1,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5_000),
};

export function useCompareStrategies(amountFlr) {
  return useQuery({
    queryKey: queryKeys.defiProtocols.compareStrategies(amountFlr),
    queryFn: () => fetchCompareStrategies(amountFlr),
    enabled: Boolean(amountFlr) && amountFlr > 0,
    staleTime: 60_000,
    // Each amount produces a distinct query key, so without this, every
    // edit to the amount input would flash the skeleton again. Keeping the
    // previous amount's result on screen while the new one loads avoids
    // that, matching the "no layout shift" requirement for a value the
    // user is actively tweaking rather than a one-time page load.
    placeholderData: keepPreviousData,
    ...QUICK_RESILIENCE,
  });
}
