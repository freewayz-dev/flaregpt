import { flareApi, coingeckoApi } from "@/services/apiClient";

export async function fetchHealth() {
  const { data } = await flareApi.get("/health");
  return data;
}

export async function fetchGasPrice() {
  const { data } = await flareApi.get("/gas-price");
  return data;
}

export async function fetchMarketOverview() {
  const { data } = await flareApi.get("/api/v1/overview/market");
  return data;
}

export async function fetchWalletBalances(walletAddress) {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/balances/${walletAddress}`,
  );
  return data;
}

export async function fetchFtsoPortfolio(walletAddress) {
  const { data } = await flareApi.get(
    `/api/v1/portfolio/ftso/${walletAddress}`,
  );
  return data;
}

// FlareGPT's own API only exposes a current spot price, not a time series,
// so historical FLR/USD price data comes from CoinGecko's public market
// API instead (no key required, Flare's coin id is "flare-networks").
export async function fetchFlrPriceHistory(days = 7) {
  const { data } = await coingeckoApi.get(
    "/coins/flare-networks/market_chart",
    { params: { vs_currency: "usd", days } },
  );
  return data.prices.map(([timestamp, price]) => ({ timestamp, price }));
}

// Candlestick mode needs real open/high/low/close data, which the plain
// price-history endpoint above doesn't have — CoinGecko's /ohlc endpoint
// does.
export async function fetchFlrOhlc(days = 7) {
  const { data } = await coingeckoApi.get("/coins/flare-networks/ohlc", {
    params: { vs_currency: "usd", days },
  });
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}
