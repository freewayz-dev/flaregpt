import { flareApi, coingeckoApi } from "@/services/apiClient";

// `signal` (react-query's own AbortController, threaded through by every
// hook in useDashboardQueries.js) is forwarded to axios on all of these —
// without it, switching wallets or navigating away left the previous
// request running to completion server-side for no reason: its result
// lands under the old wallet's cache key, never the new one, so the
// network round-trip was pure waste. Matches the pattern already
// established in rflrService.js.

interface HealthResponse {
  status: string;
}

// Only the two fields real consumers actually read (see
// NetworkActivityChart.jsx's `data?.gas_gwei`/`data?.network_tps`) — not a
// guess at the endpoint's full shape, which isn't documented anywhere and
// hasn't been independently confirmed live the way other endpoints in this
// file have.
interface GasPriceResponse {
  gas_gwei: number;
  network_tps: number;
}

// Same reasoning as GasPriceResponse: only the fields StatRow.jsx and
// Navbar.jsx actually destructure off this today.
interface MarketOverviewResponse {
  market_metrics: {
    flr_spot_price_usd: number;
    market_cap_usd: number;
    volume_24h_usd: number;
  };
  chain_infrastructure: {
    aggregate_tvl_usd: number;
  };
}

interface WalletBalancesResponse {
  balances: Record<string, number>;
}

// Shared by Dashboard's FtsoPortfolioCard/ClaimsHistoryCard/
// DelegationsBreakdownCard (via useFtsoPortfolio) AND the standalone
// FtsoRewards page (via the same hook, deriveFtsoRewards.ts) — the exact
// same `/api/v1/portfolio/ftso/{wallet}` response, so this is exported and
// reused, not redeclared. Extended here with the fields deriveFtsoRewards.ts
// confirmed real-usage of (`epoch_completion_target_yield`,
// `accrual_rate_per_second`, `velocity_source_epoch`, `weight_percentage`,
// `epoch_id`, `unclaimed_amount_flr`) — Dashboard's own cards never needed
// them, but the underlying response always had them.
export interface FtsoPortfolioResponse {
  ftso_infrastructure: {
    user_wflr_balance: number;
    cumulative_unclaimed_flr: number;
  };
  realtime_estimation: {
    estimated_hourly_earning: number;
    calculation_method: string;
    epoch_completion_target_yield?: number;
    accrual_rate_per_second?: number;
    velocity_source_epoch?: number | null;
  };
  active_delegations: {
    provider_address: string;
    provider_name: string;
    allocated_bips: number;
    // A pre-formatted percent string, when the API supplies one — see
    // SceptreVaultResponse's `pool_ownership` in defiProtocolsService.ts
    // for the same "real API field, string not number" pattern.
    weight_percentage?: string;
  }[];
  // Full entry shape beyond these two fields not independently confirmed —
  // `epoch_id`/`unclaimed_amount_flr` are what deriveFtsoRewards.ts (the
  // real consumer) actually reads; everything else on a given entry
  // remains open via the index signature, matching how
  // ClaimsHistoryCard's GenericTable derives table columns from whatever
  // keys are actually present rather than a fixed set.
  unclaimed_epochs_ledger: ({
    epoch_id: number;
    unclaimed_amount_flr: number;
  } & Record<string, unknown>)[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface OhlcPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await flareApi.get("/health", { signal });
  return data;
}

export async function fetchGasPrice(signal?: AbortSignal): Promise<GasPriceResponse> {
  const { data } = await flareApi.get("/gas-price", { signal });
  return data;
}

export async function fetchMarketOverview(signal?: AbortSignal): Promise<MarketOverviewResponse> {
  const { data } = await flareApi.get("/api/v1/overview/market", { signal });
  return data;
}

export async function fetchWalletBalances(
  walletAddress: string,
  signal?: AbortSignal,
): Promise<WalletBalancesResponse> {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/balances/${walletAddress}`,
    { signal },
  );
  return data;
}

export async function fetchFtsoPortfolio(
  walletAddress: string,
  signal?: AbortSignal,
): Promise<FtsoPortfolioResponse> {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/ftso/${walletAddress}`,
    { signal },
  );
  return data;
}

// FlareGPT's own API only exposes a current spot price, not a time series,
// so historical FLR/USD price data comes from CoinGecko's public market
// API instead (no key required, Flare's coin id is "flare-networks").
export async function fetchFlrPriceHistory(
  days = 7,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  const { data } = await coingeckoApi.get(
    "/coins/flare-networks/market_chart",
    { params: { vs_currency: "usd", days }, signal },
  );
  return data.prices.map(([timestamp, price]: [number, number]) => ({ timestamp, price }));
}

// Candlestick mode needs real open/high/low/close data, which the plain
// price-history endpoint above doesn't have — CoinGecko's /ohlc endpoint
// does.
export async function fetchFlrOhlc(days = 7, signal?: AbortSignal): Promise<OhlcPoint[]> {
  const { data } = await coingeckoApi.get("/coins/flare-networks/ohlc", {
    params: { vs_currency: "usd", days },
    signal,
  });
  return data.map(([timestamp, open, high, low, close]: [number, number, number, number, number]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}
