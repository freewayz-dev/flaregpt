import { flareApi, coingeckoApi } from "@/services/apiClient";

// `signal` (react-query's own AbortController, threaded through by every
// hook in useDashboardQueries.js) is forwarded to axios on all of these —
// without it, switching wallets or navigating away left the previous
// request running to completion server-side for no reason: its result
// lands under the old wallet's cache key, never the new one, so the
// network round-trip was pure waste. Matches the pattern already
// established in rflrService.js.



// Only the two fields real consumers actually read (see
// NetworkActivityChart.jsx's `data?.gas_gwei`/`data?.network_tps`) — not a
// guess at the endpoint's full shape, which isn't documented anywhere and
// hasn't been independently confirmed live the way other endpoints in this
// file have.


// Same reasoning as GasPriceResponse: only the fields StatRow.jsx and
// Navbar.jsx actually destructure off this today.




// Shared by Dashboard's FtsoPortfolioCard/ClaimsHistoryCard/
// DelegationsBreakdownCard (via useFtsoPortfolio) AND the standalone
// FtsoRewards page (via the same hook, deriveFtsoRewards.ts) — the exact
// same `/api/v1/portfolio/ftso/{wallet}` response, so this is exported and
// reused, not redeclared. Extended here with the fields deriveFtsoRewards.ts
// confirmed real-usage of (`epoch_completion_target_yield`,
// `accrual_rate_per_second`, `velocity_source_epoch`, `weight_percentage`,
// `epoch_id`, `unclaimed_amount_flr`) — Dashboard's own cards never needed
// them, but the underlying response always had them.






export async function fetchHealth(signal) {
  const { data } = await flareApi.get("/health", { signal });
  return data;
}

export async function fetchGasPrice(signal) {
  const { data } = await flareApi.get("/gas-price", { signal });
  return data;
}

export async function fetchMarketOverview(signal) {
  const { data } = await flareApi.get("/api/v1/overview/market", { signal });
  return data;
}

export async function fetchWalletBalances(
  walletAddress,
  signal,
) {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/balances/${walletAddress}`,
    { signal },
  );
  return data;
}

export async function fetchFtsoPortfolio(
  walletAddress,
  signal,
) {
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
  signal,
) {
  const { data } = await coingeckoApi.get(
    "/coins/flare-networks/market_chart",
    { params: { vs_currency: "usd", days }, signal },
  );
  return data.prices.map(([timestamp, price]) => ({ timestamp, price }));
}

// Candlestick mode needs real open/high/low/close data, which the plain
// price-history endpoint above doesn't have — CoinGecko's /ohlc endpoint
// does.
export async function fetchFlrOhlc(days = 7, signal) {
  const { data } = await coingeckoApi.get("/coins/flare-networks/ohlc", {
    params: { vs_currency: "usd", days },
    signal,
  });
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}
