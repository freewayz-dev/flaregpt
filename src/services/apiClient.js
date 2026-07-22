import axios from "axios";

export const flareApi = axios.create({
  baseURL: "https://api.flaregpt.io",
  timeout: 15000,
});

// CoinGecko's public API is used for FLR/USD historical price data — the
// FlareGPT API only exposes current spot price, not a time series.
export const coingeckoApi = axios.create({
  baseURL: "https://api.coingecko.com/api/v3",
  timeout: 15000,
});

// FlareGPT's API only returns USD-denominated values, so the Currency
// Display setting (AUD/EUR/GBP/RUB/USD) needs a USD-based FX rate table to
// convert against. open.er-api.com is free, requires no API key, and
// updates daily — plenty fresh for a display preference like this.
export const exchangeRateApi = axios.create({
  baseURL: "https://open.er-api.com/v6",
  timeout: 15000,
});
