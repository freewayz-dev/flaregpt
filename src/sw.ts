/// <reference lib="webworker" />
// This file needs the `webworker` lib (for `ServiceWorkerGlobalScope`,
// `self.skipWaiting`, `self.clients`, ...), which conflicts with the `dom`
// lib the rest of this app's tsconfig uses — the two declare incompatible
// versions of several of the same globals (`self` included). Type-checked
// separately via tsconfig.sw.json (see package.json's `typecheck` script,
// which runs both), not the main program — see tsconfig.json's own
// `exclude` entry for this file.
export {};
declare const self: ServiceWorkerGlobalScope;

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import type { WorkboxPlugin } from "workbox-core";

// Populated at build time by vite-plugin-pwa's `injectManifest` step (see
// vite.config.ts's `globPatterns`) — deliberately scoped to just CSS and
// the manifest/icons: genuinely static, content-hashed-or-rarely-changing
// files with no dependency on this project's own build order.
//
// JS chunks and the prerendered HTML shells (index.html, terms/index.html)
// are NOT precached here on purpose, not as an oversight. This project's
// `npm run build` runs prerendering as a *separate* step *after* `vite
// build` finishes (see prerender.ts) — by the time vite-plugin-pwa computes
// this precache manifest (during the `vite build` step itself), the real
// prerendered content doesn't exist yet, only the pristine pre-render
// shell does. Precaching against that would either precache stale/wrong
// content or require hand-rolling a second build step to recompute the
// manifest after prerendering — real complexity for a phase whose whole
// point was being minimal. The `NetworkFirst` navigation route below (see
// bottom of file) gets the identical practical result (fast repeat loads,
// offline fallback) without that ordering problem. JS/image/font caching
// is handled below via runtime routes instead, for the same reason —
// it also sidesteps Phase 1's separate concern about not force-caching the
// entire wallet-gated dashboard bundle for a landing-only visitor: a
// runtime route only ever caches a chunk once a real request for it
// happens, naturally respecting this app's existing lazy-loaded route
// structure rather than fighting it.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Bumped whenever a *shape* or *meaning* change to one of these caches
// would make old entries actively wrong to keep serving (not for every
// deploy — Workbox's own precache above already handles the "new build"
// case via content-hashed revisions; this is specifically for "the code
// that reads this cache changed what it expects to find in it"). The
// activate handler below deletes any `flaregpt-*` cache not in the
// current version's expected set, so bumping this is what actually
// purges stale-shaped entries on the next deploy rather than leaving them
// to linger indefinitely under a stable name.
const CACHE_VERSION = "v1";
const cacheName = (name: string) => `flaregpt-${name}-${CACHE_VERSION}`;

const FLAREGPT_API = "https://api.flaregpt.io";

// ---------------------------------------------------------------------
// API caching — tiered by data sensitivity. See
// docs/pwa/phase-0-foundations.md for the policy this implements and why.
// ---------------------------------------------------------------------

// Never cached, explicitly — not just left unrouted. These endpoints have
// no wallet address in their URL at all (confirmed against every
// src/services/*.ts file): they're scoped by the caller's auth token
// alone. Caching a response by URL, the way every other route here does,
// would mean a *second* person signing into the same browser/device could
// be served the *first* person's cached watchlist, chat history, or
// session data — a real cross-account leak, not a theoretical one. Every
// other financial/read endpoint in this app has the wallet address baked
// into the URL (path or query string) specifically so that risk doesn't
// apply to it; these three genuinely don't, so they're the one bucket
// that's excluded outright rather than tiered.
registerRoute(
  ({ url }) =>
    url.origin === FLAREGPT_API &&
    (url.pathname.startsWith("/api/v1/auth/") ||
      url.pathname === "/api/v1/watchlist" ||
      url.pathname.startsWith("/api/v1/watchlist/") ||
      url.pathname.startsWith("/api/v1/chat/conversations")),
  new NetworkOnly(),
);

// Tags a cache-served response so the app can show a visible "this isn't
// live" indicator (see useCacheStatusStore.ts / StaleDataBanner.tsx /
// apiClient.ts's response interceptor, the reader of this header).
// Financial data must never look live when it isn't. Applied only to the
// NetworkFirst routes below, deliberately not the StaleWhileRevalidate
// ones — SWR serving its cached copy immediately while it revalidates in
// the background is its normal, non-degraded behavior, not something that
// needs flagging the way a NetworkFirst timeout/failure fallback does.
const cacheHitMarkerPlugin: WorkboxPlugin = {
  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
    if (!cachedResponse) return cachedResponse;
    const headers = new Headers(cachedResponse.headers);
    headers.set("X-FlareGPT-Cache", "hit");
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers,
    });
  },
};

// Live financial reads: wallet balances, FTSO/DeFi/rFLR positions, wallet
// activity, market/gas price. Most of these routes are wallet-address-
// scoped (path or `user_wallet` query param) — see the comment on the
// never-cache block above for why that specifically makes them safe to key
// by URL. The two exceptions, `/api/v1/overview/market` and `/gas-price`,
// carry no wallet address at all — safe to cache by URL for a different
// reason: they're public, account-independent data (network-wide market/
// gas figures, not anything scoped to whoever's asking), so there's no
// cross-account response to leak the way there would be for the never-
// cached auth/watchlist/chat routes above. Short network timeout, then
// fall back to cache with the staleness marker rather than showing an
// error — a 30-minute expiry on the fallback itself keeps a *very* stale
// number from lingering indefinitely if someone's been offline for hours.
registerRoute(
  ({ url }) =>
    url.origin === FLAREGPT_API &&
    (url.pathname.startsWith("/api/v1/portfolio/") ||
      url.pathname.startsWith("/api/v1/rflr/") ||
      url.pathname.startsWith("/api/v1/defi/vaults/") ||
      url.pathname === "/api/v1/overview/market" ||
      url.pathname === "/gas-price"),
  new NetworkFirst({
    cacheName: cacheName("financial-reads"),
    networkTimeoutSeconds: 4,
    plugins: [
      cacheHitMarkerPlugin,
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 60 }),
    ],
  }),
);

// Same tier, cross-origin: CoinGecko FLR/USD history (dashboardService.ts).
registerRoute(
  ({ url }) => url.origin === "https://api.coingecko.com",
  new NetworkFirst({
    cacheName: cacheName("financial-reads-external"),
    networkTimeoutSeconds: 4,
    plugins: [
      cacheHitMarkerPlugin,
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 60 }),
    ],
  }),
);

// Semi-static: changes slowly, and — unlike the tier above — none of these
// are wallet- or session-scoped at all (network emissions/status are
// network-wide; gas-sniper status is explicitly a public, no-auth, "who's
// opted in" view per loopsService.ts's own comment; compare-strategies is
// a pure calculator keyed on an amount, not an account). Stale-while-
// revalidate is the right fit specifically because it's genuinely low-risk
// here — instant from cache, corrected in the background.
registerRoute(
  ({ url }) =>
    url.origin === FLAREGPT_API &&
    (url.pathname.startsWith("/api/v1/network/") ||
      url.pathname === "/api/v1/loops/gas-sniper/status" ||
      url.pathname === "/api/v1/defi/compare-strategies"),
  new StaleWhileRevalidate({
    cacheName: cacheName("semi-static-api"),
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 6 * 60 * 60 }),
    ],
  }),
);

// Same tier, cross-origin: daily FX rates for the Currency display setting.
registerRoute(
  ({ url }) => url.origin === "https://open.er-api.com",
  new StaleWhileRevalidate({
    cacheName: cacheName("semi-static-external"),
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

// ---------------------------------------------------------------------
// Static assets — cache-first, populated as requests actually happen
// (not precached; see the top-of-file comment for why JS specifically
// stays a runtime concern rather than a build-time one here).
// ---------------------------------------------------------------------

// Same-origin only — this app's own hashed JS/CSS bundle files, the one
// thing this route was ever meant for. Without the origin check, this also
// matched the cross-origin Google Fonts CSS (`request.destination` is
// `"style"` for that `<link>` too, and Workbox evaluates routes in
// registration order, so this route — registered first — claimed it
// before the dedicated, already-origin-scoped `fonts` route below ever got
// a chance to). Confirmed live: once this service worker actually
// controlled the page, both Google Fonts CSS requests failed outright
// (`net::ERR_FAILED`) on every load, while the exact same requests
// succeeded normally before the SW took control — a service worker's own
// `fetch()` call is CSP-evaluated against `connect-src`, not the original
// request's `style-src` context, and `fonts.googleapis.com` is only
// listed under `style-src` in vercel.json's CSP, not `connect-src`. The
// browser's own native HTTP cache already handles this CSS fine on its
// own (Google's CDN sends long-lived cache headers); the actual font
// *files* it references (`fonts.gstatic.com`) are unaffected by any of
// this and stay correctly cached via the dedicated `fonts` route below.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style"),
  new CacheFirst({
    cacheName: cacheName("static-resources"),
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: cacheName("images"),
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

// Cross-origin fonts — the app's own Google Fonts, plus the WalletConnect
// QR modal's own typeface (see docs/pwa/phase-0-foundations.md's CSP
// section for how `fonts.reown.com` was found). A full year is safe:
// these URLs are already versioned/immutable by the font hosts themselves.
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com" || url.origin === "https://fonts.reown.com",
  new CacheFirst({
    cacheName: cacheName("fonts"),
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  }),
);

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------

const OFFLINE_URL = "/offline.html";
const OFFLINE_CACHE = cacheName("offline-fallback");

// Only "/" and "/terms" — the two routes this app actually prerenders (see
// robots.txt/sitemap.xml).
const PUBLIC_ROUTES = [/^\/$/, /^\/terms$/];

const pageHandler = new NetworkFirst({
  cacheName: cacheName("pages"),
  networkTimeoutSeconds: 5,
});

registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        return await pageHandler.handle(params);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        if (cached) return cached;
        return Response.error();
      }
    },
    { allowlist: PUBLIC_ROUTES },
  ),
);

// `/app/*` — the gated, personalized dashboard. Phase 1 deliberately left
// this un-intercepted ("that's Phase 5 to decide"); this is that decision.
//
// vercel.json rewrites *every* `/app` and `/app/(.*)` request to the same
// static `/app-shell.html` (see prerender.ts's own comment — a pristine,
// empty-#root copy of index.html, preserved specifically so a direct
// load/refresh of any dashboard route gets a blank shell for React Router
// to take over in, not a flash of landing-page markup). That means the
// navigation *response* is byte-identical no matter which `/app/*` path
// was requested — so instead of Workbox's usual per-URL cache key (which
// would leave any dashboard route never visited before online with
// nothing to fall back to offline), `cacheKeyWillBeUsed` below normalizes
// every `/app/*` navigation to the one shared `APP_SHELL_URL` cache entry.
// Whichever dashboard route happens to load successfully first keeps that
// entry fresh, and every other route can be served from it — the shell is
// generic; React Router resolves the real sub-page client-side once it
// loads, exactly like it already does when the shell arrives from the
// network.
const APP_SHELL_URL = "/app-shell.html";
const APP_ROUTES = [/^\/app(\/.*)?$/];

const appShellCacheKeyPlugin: WorkboxPlugin = {
  cacheKeyWillBeUsed: async () => APP_SHELL_URL,
};

const appShellHandler = new NetworkFirst({
  // Shares OFFLINE_CACHE rather than its own named cache — both are
  // static, app-authored fallback documents (not per-route content), and
  // the app shell is primed into this same cache at install time below
  // for the same reason `OFFLINE_URL` already is: a user who goes offline
  // before ever completing one real `/app/*` load (e.g., installed the
  // PWA, then immediately lost connection) still needs somewhere to land.
  cacheName: OFFLINE_CACHE,
  networkTimeoutSeconds: 5,
  plugins: [appShellCacheKeyPlugin],
});

registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        return await appShellHandler.handle(params);
      } catch {
        // Falls through to the same generic offline page as the public
        // routes only in the genuinely-never-cached case (e.g. offline on
        // the very first request this service worker has ever handled) —
        // in every ordinary case the install-time-primed shell above
        // answers directly.
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        if (cached) return cached;
        return Response.error();
      }
    },
    { allowlist: APP_ROUTES },
  ),
);

// Every cache name this file can create, as of this version — anything
// else out there prefixed `flaregpt-` is left over from a previous
// version and gets swept in `activate` below. Kept as one explicit list
// rather than derived from the route registrations above so it's legible
// at a glance during an incident, not something you have to trace through
// strategy objects to reconstruct.
const CURRENT_CACHES = new Set([
  cacheName("financial-reads"),
  cacheName("financial-reads-external"),
  cacheName("semi-static-api"),
  cacheName("semi-static-external"),
  cacheName("static-resources"),
  cacheName("images"),
  cacheName("fonts"),
  cacheName("pages"),
  cacheName("offline-fallback"),
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, APP_SHELL_URL])),
      // `site.webmanifest`'s `start_url` is "/" — every standalone launch
      // from the home screen navigates here first, before anything else
      // has had a chance to populate `pageHandler`'s own cache (`NetworkFirst`
      // only ever caches "/" opportunistically, the first time a live fetch
      // for it actually succeeds). Without this, launching the installed
      // app offline for the first time (or simply never having revisited
      // "/" while online since installing) fell all the way through to the
      // generic OFFLINE_URL fallback — "you need a connection" — even
      // though this app's whole PWA offline story is built around the
      // opposite promise. Written into `cacheName("pages")` specifically
      // (the exact cache `pageHandler`'s NetworkFirst strategy already
      // reads from below), not a separate cache, so it's found as an
      // ordinary cache hit with no extra routing logic needed — the same
      // pattern this project already uses for APP_SHELL_URL above, just
      // keyed by the real URL instead of a normalized one, since (unlike
      // `/app/*`) every `/`-navigation is already the same single URL.
      caches.open(cacheName("pages")).then((cache) => cache.addAll(["/"])),
    ]),
  );
  // Deliberately no `self.skipWaiting()` here. A new service worker
  // version staying in "waiting" until the app itself decides it's safe
  // is the whole point of this phase — see UpdateAvailableToast.tsx,
  // which is what actually calls into a waiting worker, and only once
  // it's confirmed the chat WebSocket has no active stream. An
  // unannounced reload mid-answer is exactly the failure mode this is
  // built to avoid; nothing in this file activates a waiting update on
  // its own.
});

// `virtual:pwa-register`'s `updateSW()` (called from UpdateAvailableToast
// once it's safe) posts `{ type: "SKIP_WAITING" }` to the waiting worker
// and expects the worker itself to call `self.skipWaiting()` in response —
// that handshake is only auto-wired for the default `generateSW` strategy.
// This project uses `injectManifest` (see vite.config.ts's own comment on
// why), which means vite-plugin-pwa does NOT inject this listener; without
// it, `updateSW()` silently does nothing and the update prompt is a dead
// button. Confirmed empirically: clicking "Reload" produced no state
// change at all until this listener was added.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Precache cleanup is Workbox's own job (cleanupOutdatedCaches
      // above); this is specifically for the runtime caches this file
      // manages by hand — anything named `flaregpt-*` that isn't in this
      // version's expected set is a leftover from an older CACHE_VERSION
      // (or a renamed/removed cache) and won't be written to or read from
      // again, so there's no reason to keep it taking up space.
      const existingCaches = await caches.keys();
      await Promise.all(
        existingCaches
          .filter((name) => name.startsWith("flaregpt-") && !CURRENT_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
    })(),
  );
});
