

import { API_BASE as API } from "../../src/test/fixtures";

const MOCK_TOKEN = "e2e-mock-jwt-token";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// A real root cause behind a real, hard-to-diagnose CI failure: FlrPriceChart
// gets its historical price series from CoinGecko's own public API directly
// (see dashboardService.js's fetchFlrPriceHistory/fetchFlrOhlc — FlareGPT's
// own backend only exposes a current spot price, not a time series), and
// this file never mocked it. Every other REST call the app makes was mocked
// below, but this one silently fell through to a real, live, rate-limited
// third-party network call — invisible while it happened to succeed fast
// enough, but a genuine external dependency this suite never intended to
// have. It surfaced as FlrPriceChart's own "Couldn't load FLR price
// history" error state under real CI/repeated-run conditions (a free-tier
// CoinGecko rate limit from a shared IP range being the likely trigger,
// though the exact mechanism outside this app's control doesn't need to be
// pinned down — the fix is the same either way: don't depend on it). A
// handful of points with genuine variation (not identical values) —
// FlrPriceChart's own default Area view only ever needs `market_chart`, but
// `ohlc` is mocked too since switching to Candlestick mode is a real,
// reachable user path even though this specific journey doesn't exercise it.
function coingeckoPricePoints(days = 7) {
  const now = Date.now();
  const points = 12;
  const stepMs = (days * 24 * 60 * 60 * 1000) / points;
  const basePrice = 0.0068;
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - 1 - i) * stepMs,
    price: basePrice * (1 + 0.015 * Math.sin(i)),
  }));
}

// The few REST calls the three journeys actually make. The handler logic
// itself is deliberately not shared with src/test/mocks/handlers.js (MSW)
// — different interception APIs (page.route vs. MSW request handlers), kept
// self-contained per the plan's "no cross-tool fixture sharing" call — but
// the API host string is just a fixture value (same category as
// TEST_ADDRESSES, same file), so it's still the one canonical source
// rather than a seventh hand-typed copy.
//
// Registered on `page.context()`, not `page` itself — a second real CI
// failure after the CoinGecko mocks were first added, where the price
// history request still went out live even though it now had a matching
// route. sw.js (this app's real, production service worker, running here
// since these tests exercise the real build) has its own explicit
// `registerRoute(({ url }) => url.origin === "https://api.coingecko.com",
// ...)` — once the SW controls the page, that request is claimed and
// re-issued by the *service worker's own fetch handler*, a separate
// execution realm `page.route()` was never able to see (the same root
// cause already diagnosed once before in this suite for a different
// endpoint). `context.route()` intercepts at the browser-context level,
// which does cover SW-realm-initiated fetches, so it's used everywhere
// here now rather than only for the two CoinGecko routes that strictly
// need it — the other four aren't SW-claimed today, but there's no
// downside to context-level interception for them either, and it removes
// the risk of this same class of bug recurring if sw.js's own routing
// ever expands to cover them.
export async function mockRestEndpoints(page) {
  const context = page.context();

  await context.route(`${API}/api/v1/watchlist`, (route) =>
    route.fulfill({ json: { wallets: [] } }),
  );

  await context.route(`${API}/api/v1/portfolio/balances/*`, (route) =>
    route.fulfill({ json: { balances: { FLR: 1234.5678, WFLR: 500 } } }),
  );

  // Connecting the mock wallet auto-triggers useAuthSync's sign-in
  // ceremony (nonce -> personal_sign -> verify) — see useAuthSync.js. The
  // injected wallet itself answers personal_sign locally (no network
  // call), but nonce/verify are real REST calls that need a response or
  // the connect step hangs waiting on a real backend.
  await context.route(`${API}/api/v1/auth/nonce`, (route) =>
    route.fulfill({ json: { message: "Sign this message to verify your wallet: e2e-nonce" } }),
  );

  await context.route(`${API}/api/v1/auth/verify`, (route) =>
    route.fulfill({ json: { token: MOCK_TOKEN } }),
  );

  await context.route(`${COINGECKO_BASE}/coins/flare-networks/market_chart*`, (route) =>
    route.fulfill({
      json: { prices: coingeckoPricePoints().map((p) => [p.timestamp, p.price]) },
    }),
  );

  await context.route(`${COINGECKO_BASE}/coins/flare-networks/ohlc*`, (route) =>
    route.fulfill({
      json: coingeckoPricePoints().map((p) => [
        p.timestamp,
        p.price * 0.995,
        p.price * 1.01,
        p.price * 0.99,
        p.price,
      ]),
    }),
  );
}

// Full WebSocket mock — chatSocket.js connects to
// wss://api.flaregpt.io/ws/chat/{address}[?token=...]. Not calling
// ws.connectToServer() means Playwright never opens a real connection at
// all, matching the same "fully mocked, no pass-through" approach Phase 3
// used with MSW's ws.link().
export async function mockChatSocket(page, { reply = "Mocked reply." } = {}) {
  await page.routeWebSocket(/wss:\/\/api\.flaregpt\.io\/ws\/chat\/.*/, (ws) => {
    ws.onMessage(() => {
      ws.send(JSON.stringify({ type: "status", content: "Thinking..." }));
      ws.send(JSON.stringify({ type: "token", content: reply }));
      ws.send(JSON.stringify({ type: "done", conversation_id: null }));
    });
  });
}
