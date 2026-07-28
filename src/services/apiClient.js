import axios from "axios";

import { useAuthStore } from "@/store/useAuthStore";

export const flareApi = axios.create({
  baseURL: "https://api.flaregpt.io",
  timeout: 15000,
});

// Reads auth state straight from the store at the moment each request is
// actually sent, rather than every call site threading it through
// manually — a logout that happens between two requests can never
// accidentally attach a stale token to one that hasn't gone out yet.
// Requests made before any session exists (nonce/verify) simply get no
// header, which is what the auth endpoints expect from an unauthenticated
// caller.
//
// `connectedAddress` (a live mirror of wagmi's address — see
// useAuthStore.js/useAuthSync.js) is checked against `authenticatedAddress`
// specifically to close the window where Wallet A's token could otherwise
// keep attaching to requests after the user switches to Wallet B but
// before Wallet B's own sign-in completes: the UI already shows B active,
// so no request should act as A in the meantime. A `null` connectedAddress
// (wallet disconnected) is deliberately *not* treated as a mismatch —
// staying authenticated with no wallet connected at all is the whole
// point of decoupling auth from connection.
flareApi.interceptors.request.use((config) => {
  const { token, authenticatedAddress, connectedAddress } = useAuthStore.getState();
  const mismatchedWallet =
    authenticatedAddress &&
    connectedAddress &&
    authenticatedAddress.toLowerCase() !== connectedAddress.toLowerCase();

  if (token && !mismatchedWallet) {
    config.headers = config.headers ?? {};
    // The backend reads this as a raw string and expects the standard
    // "Bearer <token>" scheme prefix — sending the bare token (confirmed
    // directly against the live API) parses as no credential at all, so
    // every authenticated request 401's even with a perfectly valid token.
    // That was the actual cause of "signed in, but refresh logs me out":
    // /auth/me legitimately failing, not the token being wrong.
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
