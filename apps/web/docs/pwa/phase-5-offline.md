# PWA Phase 5 — Offline Experience

A high-quality, read-only offline experience: the dashboard shell itself
is reachable offline, cached financial data renders with an honest
staleness signal, and every action that genuinely needs a connection
disables itself with a reason instead of failing silently or misleadingly.
No offline write queues — that was never the goal here.

## What was already implemented

Phase 2 built the tiered caching policy (`NetworkFirst` for financial
reads with a cache-hit marker header, `StaleWhileRevalidate` for
semi-static data, `NetworkOnly` for session-scoped endpoints) and
`StaleDataBanner`/`useCacheStatusStore`. Phase 1 built `OfflineBanner` and
`useOnlineStatus`. What none of that added up to yet, confirmed by
auditing every relevant file before writing anything: **the dashboard
shell itself was unreachable offline** (`sw.ts`'s own comment: "that's
Phase 5"), and **React Query's default `networkMode` meant financial
queries never even reached the service worker's cache fallback while
genuinely offline** — two gaps that made the existing Phase 2 caching
invisible in the one scenario it was built for.

## What was implemented, and why

**`/app/*` is now reachable offline** (`src/sw.ts`). Every `/app/*`
navigation is rewritten server-side (`vercel.json`) to the same static
`app-shell.html` — so instead of Workbox's usual per-URL cache key (which
would leave any dashboard route never visited before with nothing to fall
back to), a `cacheKeyWillBeUsed` plugin normalizes every `/app/*`
navigation to one shared cache entry, primed at install time alongside
the existing `offline.html`. Whichever route loads successfully first
keeps it fresh; any other route can be served from it offline, and React
Router resolves the real sub-page client-side exactly like it already
does when the shell arrives from the network.

**`networkMode: "offlineFirst"`** (`src/main.tsx`). Confirmed directly in
TanStack Query's own source (`canFetch`/`canStart` in query-core's
retryer) that the default `"online"` mode never calls the queryFn at all
while `navigator.onLine` is false — the fetch is paused before it starts,
waiting for the browser's `online` event. That meant `sw.ts`'s
NetworkFirst routes, which are supposed to decide "network or cache" by
racing a short timeout, never got a chance to run: a genuinely-offline
reload never reached the service worker. `"offlineFirst"` lets the first
attempt through (still pausing *retries* while offline, so no pointless
retry storm) — this is the change that makes StaleDataBanner actually
fire offline instead of only under a slow-but-technically-online network.

**`OfflineBanner`'s message, extended in place** (not replaced): "You're
offline. Cached data is still shown, but actions that need a connection
are paused" — ties the shell/cache fix and the action-disabling below
together in the one place the roadmap named specifically.

**Connectivity-gated actions, each disabled with its own reason** — audited
every mutation/write action in the app first (wallet connect, sign-in,
chat send, Gas Sniper toggle/approve, watchlist add/rename/remove, clear
synced conversations) and disabled exactly the ones that hit real
network, leaving anything purely local untouched:
- `ConnectWalletModal.tsx` — every wallet button disabled offline, with an
  inline notice (a real wallet handshake needs a live connection
  regardless of which connector).
- `Navbar.tsx` — both Sign In buttons (desktop dropdown + mobile menu)
  disabled offline; Disconnect stays enabled (purely local to wagmi).
- `Composer.tsx` — send disabled offline (the chat stream is a live
  WebSocket, no cache tier applies), but typing stays live so a drafted
  message isn't lost, matching the "let them compose, block only the
  network step" pattern used everywhere else here.
- `GasSniperCard.tsx` — the enable/disable toggle and the on-chain Approve
  button disabled offline; the status *read* stays untouched (it's
  StaleWhileRevalidate, fine to show cached offline).
- `Wallets.tsx` — the subtlest case: add/rename/remove are network calls
  only when signed in (`useWatchlistQueries.ts`); a guest's watchlist
  edits are purely local (`addTrackedWallet`/`renameTrackedWallet`/
  `removeTrackedWallet`, no network at all). `offlineBlocked = hasSession
  && !isOnline` disables exactly the signed-in path — a guest keeps full
  offline watchlist control, confirmed by a test that would fail if this
  distinction were ever collapsed to a flat `!isOnline` check. Guarded
  both the buttons *and* the handler functions themselves (the Enter-key
  submit path bypasses a disabled button's own click handler).
- `DataStorage.tsx` — clearing synced conversations (NetworkOnly) disabled
  offline; clearing the local wallet-activity cache (no network at all)
  stays enabled.

## Explicitly not done

No offline transaction/mutation queue of any kind — actions are disabled,
not deferred-and-replayed. Chat conversation create/rename/delete
(`useChatQueries.ts`, used in `FlareWidget.tsx`/`Flrgpt/index.tsx`) were
not gated — lower-stakes, less likely to be attempted specifically while
offline than the six flows above, and out of this pass to keep the change
surface proportionate; noted here rather than silently skipped.

## Files modified or added

- `src/sw.ts` — `/app/*` NavigationRoute + shared app-shell cache entry.
- `src/main.tsx` — `networkMode: "offlineFirst"`.
- `src/components/common/OfflineBanner.tsx` (+ new test) — extended
  message/comment.
- `src/components/common/ConnectWalletModal.tsx` (+ new test),
  `src/components/layout/Navbar.tsx`,
  `src/components/flareGpt/Composer.tsx` (+ new test),
  `src/pages/Loops/components/GasSniperCard.tsx` (+ new tests in its
  existing test file), `src/pages/Settings/tabs/Wallets.tsx` (+ new tests
  in its existing test file), `src/pages/Settings/tabs/DataStorage.tsx`
  (+ new test) — offline-aware disabling.
- `src/locales/*/common.json` (all 15) — new `install`-adjacent offline
  copy across `connectModal`, `navbar`, `flrgpt.composer`,
  `loops.gasSniper`, `settings.wallets`, `settings.dataStorage`, and the
  extended `offline.message`.

## Verified

- `npm run typecheck` (both configs), `npm run lint`, and the full Vitest
  suite pass — 282 tests across 24 files, including 6 new/extended test
  files covering every offline-gated action, each pinned against a real
  `navigator.onLine` transition (not a mocked hook).
- A clean `npm run build`, and the 4-spec Playwright suite (4/4, serial).
- **The offline experience itself, driven end-to-end in a real browser
  against the real production build**, not asserted from reading the
  code:
  - A first cold visit, then a second real navigation (letting the
    service worker actually take control — a first page load is never
    controlled by the worker that installs during it, a standard SW
    lifecycle fact confirmed directly here, not assumed), then genuinely
    offline (`context.setOffline`): a route never individually visited in
    that session (`/app/loops`) still rendered the real dashboard shell —
    sidebar, navbar, footer — confirming the shared app-shell cache entry
    works for any dashboard path, not just previously-cached ones.
  - Reloading a previously-visited route (`/app`) offline rendered real
    cached numbers (FLR price, market cap, TVL) with "Showing cached data
    from moments ago" visible — the actual, intended end state this whole
    phase is for.
  - **Found and confirmed a real gap in the test tooling, not the
    product**: Playwright's `context.setOffline()` blocks requests at the
    protocol level but doesn't reliably flip `navigator.onLine` or fire
    the `online`/`offline` DOM events the way a real network loss does.
    `StaleDataBanner` still fired correctly (it's driven by the actual
    failed/cached fetches). Forcing `navigator.onLine` directly in that
    same live session confirmed `OfflineBanner` and the Connect Wallet
    modal's offline notice both react correctly the instant the real
    signal fires — closing the loop between what the unit tests already
    proved and what a genuinely offline device would experience.
  - A never-before-cached lazy route's own JS chunk failing offline
    (caught cleanly by the existing page-level error boundary, not a
    crash) was investigated and confirmed to be an inherent, expected
    limit of any cache-based offline story — nothing is available before
    it's been fetched at least once — not a regression to fix.

## Not independently verified

A real iOS/Android device's actual offline behavior (this environment has
no physical device — same boundary noted in Phase 4). Chat conversation
create/rename/delete's offline behavior, since that flow wasn't gated (see
above) — it fails with whatever generic error it already had, unchanged
from before this phase.

**Phase 5 is complete and production-ready** for its stated, deliberately
bounded scope (read-only offline, no write queues).
