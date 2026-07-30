import axios from "axios";
import { toast } from "react-toastify";

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

// The backend's own `/auth/verify` response confirms tokens expire after
// 30 days (`expires_in: 2592000`), not never — but until now nothing in the
// app noticed that happening mid-session. useAuthSync.js's mount-time check
// only ever catches an already-invalid token on a fresh page load; a token
// that expires (or gets revoked) while the app is already open would just
// make every request that carried it fail with a generic "couldn't load" +
// retry, and retrying can never succeed since the same expired token 401s
// every time — indistinguishable from a real network problem to the user.
//
// Scoped to requests that actually carried a token (`hadToken`, captured
// from the same store snapshot the request interceptor above used) —
// a 401 from an endpoint that's *expected* to 401 for a guest (watchlist,
// conversations, etc.) is normal and must never clear a session that was
// never there to begin with. `toastId` dedupes the message when several
// wallet-scoped queries all 401 around the same moment.
flareApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const { token, clearAuth } = useAuthStore.getState();
      if (token) {
        clearAuth();
        toast.error("Your session expired. Please sign in again.", {
          toastId: "session-expired",
        });
      }
    }
    return Promise.reject(error);
  },
);

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
