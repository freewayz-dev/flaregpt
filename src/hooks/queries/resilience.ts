import { isAxiosError } from "axios";

// Shared retry/backoff profiles reused across query hook files — these were
// previously copy-pasted (identically) into useDashboardQueries.js,
// useDefiProtocolsQueries.js, and useRflrQueries.js, which meant tuning one
// was easy to forget to mirror in the others. Endpoint-specific profiles
// that genuinely differ (rFLR's melt-schedule/exit-quote, wallet activity's
// large-history fetch) stay local to their own hook file, built on top of
// `retryUpTo` below instead of duplicating the status-check logic.

// A definitive 4xx (bad request, unauthenticated, forbidden, not found,
// conflict, unprocessable, ...) fails identically on every retry — an
// expired/invalid auth token in particular will 401 forever, so retrying it
// only delays the error+retry UI (or the global session-expiry handling in
// apiClient.js) the user actually needs to see. 429 (rate limited) and 5xx
// (transient upstream trouble) are worth retrying since they can resolve on
// their own; so is a network error with no response at all (offline, DNS
// hiccup, a CORS-blocked preflight) — `error.response` is only ever absent
// for exactly that case, normally.
//
// The one other time `error.response` is absent: a request WE cancelled via
// AbortController (axios rejects those with `code: "ERR_CANCELED"`, no
// response). That case is deliberately excluded from "no response, worth
// retrying" — retrying a request against a signal that's already
// permanently aborted just re-fails identically every attempt, burning the
// full retry budget for nothing. Confirmed this was a real bug, not
// theoretical: React 18 StrictMode's dev-only mount→cleanup→mount
// double-invoke aborts the first conversation-history fetch in
// useFlareGptConversation.js, and this path had been retrying that aborted
// request 3 times before finally giving up — during which the loading flag
// stayed stuck, reading as an infinite spinner in `npm run dev` specifically
// (StrictMode never runs in a production build, which is why it looked fine
// on Vercel).
export function isRetryableStatus(error: unknown): boolean {
  if (isAxiosError(error)) {
    if (error.code === "ERR_CANCELED") return false;
    const status = error.response?.status;
    if (!status) return true;
    if (status === 429) return true;
    return status >= 500;
  }
  // A non-axios error has no status to check — treated as retryable,
  // matching the axios branch's own "no response at all" fallback above.
  return true;
}

// Caps retries at `maxRetries` AND only for errors worth retrying at all —
// every profile below is `retryUpTo(n)` rather than a bare number so a
// definitive 4xx fails fast instead of burning `n` attempts it was always
// going to lose.
export function retryUpTo(maxRetries: number) {
  return (failureCount: number, error: unknown) =>
    failureCount < maxRetries && isRetryableStatus(error);
}

// A capped retry/backoff for global (non-wallet-specific) endpoints.
// Without this, the app-wide default (retry: 1 with react-query's default
// up-to-30s backoff) combined with a 15s axios timeout meant a single flaky
// request could sit "loading" for close to a minute before finally
// surfacing an error — which reads as an infinite hang to a user, even
// though it does eventually resolve. Bounding both the retry count and the
// backoff delay makes every card's error+retry UI show up promptly instead.
export const QUICK_RESILIENCE = {
  retry: retryUpTo(1),
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 5_000),
};

// For wallet-specific endpoints that are more exposed to transient network
// blips than the global stats endpoints (per-request work, not cached
// upstream). A few retries with exponential backoff ride out a brief blip
// automatically; each card still offers a manual retry button for a longer
// outage.
export const WALLET_QUERY_RESILIENCE = {
  retry: retryUpTo(3),
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
};
