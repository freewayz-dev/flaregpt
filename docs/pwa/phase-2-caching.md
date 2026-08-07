# PWA Phase 2 — Smart Caching

Implements the tiered policy already written down in
`docs/pwa/phase-0-foundations.md`. This doc covers what actually changed
and — the part that mattered most — how every endpoint's tier was decided,
not guessed.

## How endpoints were classified

Read every `flareApi.get(...)` call across `src/services/*.ts` (not
sampled — all of them) specifically to answer one question: **does the URL
already encode which wallet/account this response is about, or is it
scoped only by the caller's auth token?** That distinction is the entire
basis for what's safe to cache by URL:

- **Wallet-address-scoped** (path or query param — `/portfolio/balances/
  :address`, `/defi/vaults/mxrpy?user_wallet=...`, etc.): safe. Two
  different wallets naturally get two different cache keys. Even if the
  request also carries a bearer token, the response itself is public
  on-chain data (anyone can look up any address's balance on a block
  explorer) — caching it isn't exposing anything private.
- **Token-scoped only, no address anywhere in the URL** (`/api/v1/
  watchlist`, `/api/v1/chat/conversations*`, `/api/v1/auth/*`): unsafe to
  cache by URL. A second person signing into the same browser/device would
  hit the identical cache key and could be served the *first* person's
  cached watchlist or chat history. These are explicitly routed through
  `NetworkOnly()` — not just left unrouted — specifically so this is a
  visible, intentional decision in the code, not something a future
  broader regex could accidentally start matching.
- **Global, no wallet/session dependency at all** (`/health`, `/gas-price`,
  `/api/v1/network/*`, `/api/v1/loops/gas-sniper/status` — confirmed via
  that file's own comment: "no auth... global view" — `/api/v1/defi/
  compare-strategies`, a pure calculator keyed on an amount): safe for the
  more relaxed stale-while-revalidate tier, since there's no per-account
  risk to weigh against the UX win of instant-from-cache.

## What's cached, and how

| Tier | Strategy | Cache name(s) | Examples |
|---|---|---|---|
| Financial reads | NetworkFirst, 4s timeout, marked on fallback | `financial-reads`, `financial-reads-external` | wallet balances, FTSO/rFLR/DeFi positions, market overview, gas price, CoinGecko price history |
| Semi-static | StaleWhileRevalidate | `semi-static-api`, `semi-static-external` | network status/emissions, gas-sniper status, compare-strategies, FX rates |
| Never cached | NetworkOnly (explicit) | — | auth, watchlist, chat conversations |
| Static assets | CacheFirst, populated on request | `static-resources` | JS chunks, CSS |
| Images | CacheFirst, populated on request | `images` | showcase screenshots, wallet/protocol icons |
| Fonts | CacheFirst, 1 year | `fonts` | Google Fonts, the WalletConnect modal's own typeface |

JS/image/font caching is runtime-populated, not precached — consistent
with Phase 1's own reasoning: a landing-only visitor never pays the
storage cost of dashboard-only chunks they never requested, and it
naturally respects the app's existing lazy-loaded route structure instead
of fighting it.

## The staleness indicator

The one piece with real new application code, not just service worker
config — because "network-first with a cache fallback" is silent by
default, and silently showing a stale wallet balance as if it were live is
exactly the failure mode Phase 0's policy exists to prevent.

- `src/sw.ts`'s `cacheHitMarkerPlugin` tags a cache-served response with
  `X-FlareGPT-Cache: hit` — applied only to the two `NetworkFirst`
  (financial-reads) routes, deliberately not the `StaleWhileRevalidate`
  ones, since SWR serving its cached copy immediately while it revalidates
  in the background is normal, non-degraded behavior, not something that
  needs flagging the way a NetworkFirst timeout/failure fallback does.
- `apiClient.ts`'s `trackCacheFreshness` reads that header on every GET
  response (both `flareApi` and `coingeckoApi`) and updates
  `useCacheStatusStore` — a small, deliberately global (not per-card)
  store, matching `OfflineBanner`'s own existing app-wide approach rather
  than introducing a new per-request UI pattern.
- `StaleDataBanner.tsx`, mounted as `OfflineBanner`'s sibling in
  `DashboardLayout.tsx`, shows "Showing cached data from N minutes ago"
  whenever that store is set. A genuinely different condition from
  `OfflineBanner`: that one means "no network connection at all"; this one
  can fire while fully online — a timeout, a slow connection, a backend
  hiccup — which is exactly the case a plain online/offline check can't
  see.

## Verified

Rather than mock the backend, this was checked against the real
`api.flaregpt.io`/`api.coingecko.com`/`open.er-api.com` traffic the
dashboard actually generates on load, driven through the real built output
via the same faithful static server (`e2e/static-server.ts`) used
throughout this project's PWA work:

- After a real dashboard load, `financial-reads` correctly contained real
  cached responses for `overview/market` and `gas-price`;
  `financial-reads-external` correctly contained CoinGecko's real price-
  history and OHLC responses; `semi-static-external` correctly contained
  the real FX-rate response. `static-resources` and `images` correctly
  filled with exactly the chunks/assets that specific page load actually
  requested, not the whole app.
- `/api/v1/watchlist` never appeared in any cache, under any tier, across
  every test run — including after the dashboard's own code attempted to
  call it.
- Going offline and re-fetching a previously-cached financial endpoint
  returned the real cached body with `X-FlareGPT-Cache: hit` — confirmed
  directly, not inferred.
- The client-side half (does the interceptor correctly read that header
  and update the store?) is covered by 3 new tests in
  `src/services/apiClient.test.ts`, using this project's existing MSW-based
  pattern for this file rather than fighting service-worker timing in a
  browser test for logic that's really just "does this interceptor react
  correctly to a response header" — 109/109 unit tests pass, `typecheck`
  (both configs), `lint`, a clean production build, and 4/4 e2e all pass.

**Not independently verified**: the staleness banner's actual on-screen
appearance during a live offline dashboard session in this environment —
reloading `/app` while offline hits Phase 1's own deliberate exclusion of
`/app/*` from the service worker's navigation handling (that's Phase 5's
call to make, not this phase's), which makes a full page reload an
unreliable way to observe it here. The two halves that make it work — the
service worker tagging cache-served responses, and the interceptor
reacting to that tag — are each independently proven correct above; what's
not independently re-proven is the visual wiring between them in a live
browser session, which the component's own logic (and the fact that
`OfflineBanner` already works this exact way in production) supports but
doesn't substitute for an eyes-on check.
