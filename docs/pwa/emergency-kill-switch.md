# PWA emergency kill-switch

A pre-written, pre-tested escape hatch for exactly one scenario: the real
service worker (`src/sw.ts`) is stuck serving broken or stale content to
real users, and the normal update path — a polite "waiting" worker plus an
explicit user click, see `docs/pwa/phase-3-updates.md` — either isn't fast
enough, or isn't reaching them because the thing that's broken *is* the
update path itself. Written and tested now, in a calm moment, specifically
so nobody has to design and debug an incident-response tool *during* an
incident.

## What it does

`src/sw.emergency.ts` is deliberately the opposite of `sw.ts`'s own
philosophy in every way that file is careful: on `install` it calls
`self.skipWaiting()` unconditionally (no waiting for user consent — see
below for why that's safe here specifically). On `activate` it deletes
every cache this app could have created, claims every open client, and
force-navigates every open tab. No staleness checks, no "is the chat
mid-stream" guard — getting every client back to a known-clean state takes
priority over not interrupting whatever they were doing. It has no `fetch`
handler at all, so once active it doesn't intercept anything — every
request just goes straight to the network.

## Deploying it

```
VITE_PWA_EMERGENCY_SW=1 npm run build
```

deploys `src/sw.emergency.ts` in place of `src/sw.ts` — same scope, no
code edits. `vite.config.ts`'s `VITE_PWA_EMERGENCY_SW` check switches
`VitePWA`'s `filename` to `sw.emergency.ts` and also skips
`workbox-build`'s `injectManifest` step for that build (the emergency
worker has no `self.__WB_MANIFEST` placeholder to inject into — there's
nothing to precache when the entire point is deleting every cache). Ship
the resulting `dist/` exactly like a normal deploy.

## Why it does *not* unregister itself

The obvious-looking design — clear caches, unregister, force-reload — has
a real bug, **found empirically, not by reasoning about the code**: this
app's `main.tsx` calls `registerSW()` unconditionally on every page load.
The browser only skips reinstalling a service worker when an
already-registered, byte-identical script exists at that scope.
Unregistering destroys that fast path — so the forced reload's fresh page
load calls `registerSW()` again, the browser finds *no* existing
registration, treats the identical script as brand new, and reinstalls it
— which immediately repeats the entire cycle. Driving this through a real
Playwright session against a real production build showed it exactly as
it would appear to a user: dozens of reloads in a few seconds, an
unusable tab, forever (or until the emergency build itself is taken back
down).

Leaving the registration in place fixes it. The second load's
`registerSW()` call finds an identical, already-active worker and does
nothing further — caches are still fully cleared and every open client
still gets forced through exactly one clean reload, it just settles
instead of looping. Staying registered has no further effect on what
clients see, since there's no `fetch` handler behind it.

## Reverting

There is no special revert mechanism, and none is needed. Deploy the real
`src/sw.ts` build normally (`npm run build`, no env var). Because it's a
*different* script URL (`sw.js` vs. `sw.emergency.js`) at the same scope,
the browser treats it as a normal new-version install — not blocked by
the emergency worker still being registered. Clients still connected pick
it up through the exact same update-prompt flow as any other release (see
`docs/pwa/phase-3-updates.md`): the "new version available" toast appears,
and clicking "Reload" activates it. There's no reason to fast-track that
click past the chat-safety gate for a revert specifically — by the time
you're deploying the real `sw.ts` again, the emergency's job (getting
everyone off whatever was actually broken) is already done.

## Verified

Built and driven end-to-end against the real production build via
`e2e/static-server.ts` (the same faithful, `vercel.json`-reading static
server this project's whole e2e suite uses) and a real headless Chromium
session, reading real `caches.keys()` / `navigator.serviceWorker`
state back after each step rather than asserting from the code:

1. **Baseline**: normal `sw.js` build, loaded once, confirmed controlling
   the page with real populated caches (`flaregpt-offline-fallback-v1`,
   the Workbox precache, `flaregpt-static-resources-v1`,
   `flaregpt-images-v1`).
2. **Deploy the emergency build under a live page** (`dist/` swapped out
   from under an already-open tab, matching a real incident deploy) and
   reload: exactly one forced navigation observed (not a loop — the fix
   above, confirmed by the fix actually working, not just by the absence
   of the original bug), landing on `sw.emergency.js` as the controller
   with `caches.keys()` returning an empty array.
3. **Revert**: rebuilt the normal `sw.js` while the emergency worker was
   still active and controlling. The real "new version available" toast
   appeared (the same component Phase 3 built for ordinary updates,
   exercised here with zero special-casing); clicking "Reload" activated
   the real worker and the page ended up back on `sw.js` as controller.

Every step above was run to completion at least twice; the loop bug (step
2, before the fix) and its absence (after) were each reproduced directly,
not inferred from one run.

**Not yet done**: this has not been exercised against a real deployed
Vercel environment, only the local static server that faithfully replays
`vercel.json`'s rewrites and headers. The mechanics being tested here
(service worker registration/scope semantics, cache APIs, the
`VITE_PWA_EMERGENCY_SW` build toggle) don't depend on anything
Vercel-specific, but a first real incident is still the first time this
runs against production infrastructure itself.
