# PWA Phase 3 — Update Management

Implements the update lifecycle called for by the roadmap, with one hard
rule driving every decision below: an update must never activate while
FlareGPT's chat WebSocket has a response in flight. Reloading out from
under someone mid-answer — killing the stream with no warning — is the one
failure mode this phase exists to prevent.

## What was already in place

Phase 1 already set `registerType: "prompt"` in `vite.config.ts` and left
a forward-referencing comment in `src/sw.ts`'s `install` handler
(deliberately no `self.skipWaiting()`) — the decision not to auto-activate
had already been made; this phase is what actually decides *when* it
becomes safe to.

## What was implemented

**The safe-activation core.** `isChatGenerating(messages)` — exported from
`useFlareGptStore.ts`, single-sourced with `useFlareGptConversation.ts`'s
own identical derivation rather than a second copy of the same check — is
the one predicate everything else is built on: the last message is an
assistant message whose `status` isn't `"complete"`.

**`UpdateAvailableToast.tsx` / `UpdateToastContent.tsx`.**
`promptForUpdate(applyUpdate)` is called once, from `main.tsx`'s
`registerSW({ onNeedRefresh })` — not a component itself, since that
callback fires whenever a new worker enters "waiting," entirely outside
React's render cycle. It reuses the app's existing `react-toastify`
`ToastContainer` rather than a second notification system. Clicking
"Reload" is still what's required — nothing activates an update on its
own — but the actual effect is deferred: if `isChatGenerating` is true at
click time, the toast is rewritten to "Update will apply as soon as your
current response finishes" and a `useFlareGptStore.subscribe()` callback
(used directly against `getState()`, not the `useFlareGptStore()` hook,
since this code runs outside any component) waits for it to flip false
before calling `applyUpdate()`. `UpdateToastContent` lives in its own file
purely because `eslint-plugin-react-refresh` won't let a file export both
a component and a non-component (`promptForUpdate`) together — not a
functional split, a lint-boundary one.

**The `SKIP_WAITING` message listener sw.ts was missing.** `updateSW()`
(the function `registerSW()` returns) posts `{ type: "SKIP_WAITING" }` to
the waiting worker and expects the worker to call `self.skipWaiting()` in
response. That handshake is auto-injected only for the default
`generateSW` strategy — this project uses `injectManifest` (`sw.ts` needs
real control over navigation/offline-fallback logic that `generateSW`'s
declarative config can't express), which means vite-plugin-pwa does *not*
wire it up. Without it, clicking "Reload" was a dead button: the toast
dismissed, nothing else happened. **Confirmed empirically, not just
reasoned about** — see Verified below. Fixed with a five-line listener in
`sw.ts`.

**Cache-version hygiene on activate.** `CACHE_VERSION` + a `cacheName()`
helper now prefix every custom cache `sw.ts` creates
(`flaregpt-financial-reads-v1`, etc.), and an explicit `CURRENT_CACHES` set
plus an `activate`-time sweep deletes any `flaregpt-*` cache not in that
set. Workbox's own `cleanupOutdatedCaches()` (already present from Phase
1) only touches the precache — it has no idea Phase 2's runtime caches
exist. Bumping `CACHE_VERSION` is now how a future cache-shape change gets
cleaned up on the next activate, instead of orphaning old caches forever.

**The emergency kill-switch.** `src/sw.emergency.ts` — see
`docs/pwa/emergency-kill-switch.md` for the full design, the deploy
toggle, and why it deliberately does *not* unregister itself.

## i18n

New `update.available` / `update.reload` / `update.waitingForReply` keys,
added to all 15 locales via the project's normal `npm run i18n:extract`
pipeline. That same run re-surfaced a Phase-2-era bug (see below).

## A durable bug fix that isn't new Phase 3 scope, but blocked it

`i18next-parser` treats the literal interpolation key name `count` (e.g.
`t("key", { count: n })`) as a permanent, automatic trigger for CLDR
plural-form generation, regenerating `_one`/`_other` variants on *every*
extraction run — regardless of what the target JSON already contains. This
had already re-corrupted `staleData.minutesAgo` (Phase 2's own flat-key
fix only survived until the next routine extract). Renamed the
interpolation variable in `StaleDataBanner.tsx` from `count` to `minutes`
— `t("staleData.minutesAgo", { minutes })` — removing the trigger instead
of re-flattening the output after the fact. Re-ran the extractor alone
(no translation step) afterward and confirmed `staleData` stayed flat:
proof the fix is durable, not another patch that dies on the next run.

## Files modified or added

- `src/store/useFlareGptStore.ts` — `isChatGenerating` export.
- `src/hooks/useFlareGptConversation.ts` — reuses it instead of its own
  inline derivation.
- `src/components/common/UpdateAvailableToast.tsx` (new),
  `src/components/common/UpdateAvailableToast.test.tsx` (new),
  `src/components/common/UpdateToastContent.tsx` (new).
- `src/main.tsx` — wires `registerSW`'s `onNeedRefresh` to
  `promptForUpdate`.
- `src/sw.ts` — `SKIP_WAITING` listener, `CACHE_VERSION`/`cacheName()`,
  `CURRENT_CACHES`, activate-time sweep.
- `src/sw.emergency.ts` (new), `tsconfig.sw.json`, `tsconfig.json` —
  see `docs/pwa/emergency-kill-switch.md`.
- `vite.config.ts` — `VITE_PWA_EMERGENCY_SW` build toggle.
- `src/components/common/StaleDataBanner.tsx` — `count` → `minutes`.
- `src/locales/*/common.json` (all 15) — new `update.*` keys, the
  `staleData.minutesAgo` pluralization fix.

## Verified

- `npm run typecheck` (both configs), `npm run lint`, and the full Vitest
  suite (115/115, including 3 new tests in
  `UpdateAvailableToast.test.tsx`) all pass.
- **The `SKIP_WAITING` bug was found, not assumed** — via a real
  Playwright script driving a real production build through
  `e2e/static-server.ts`: deployed a version-bumped `sw.js`, confirmed the
  update toast rendered, clicked "Reload," and watched the registration
  sit in `waiting` indefinitely with zero state change for 20+ seconds.
  Added the listener, reran the identical script: the toast's click now
  drives the worker from `waiting` to `active` and the page reloads
  automatically (the library's own default `onNeedReload` behavior, left
  un-overridden since nothing about it conflicts with the chat-safety
  gate — that gate controls *when* `applyUpdate()` is called, not what
  happens after).
- The chat-safety gate itself is covered by
  `UpdateAvailableToast.test.tsx`: applies immediately when nothing is
  streaming; defers when `isChatGenerating` is true and applies only after
  the store's assistant message flips to `"complete"`; never applies at
  all if the reply finishes without the user ever clicking "Reload."
- A clean `npm run build`, and the 4-spec Playwright suite passing (see
  its own note on transient flakiness under this machine's memory
  pressure during this session — confirmed unrelated to any Phase 3
  change via repeated isolated reruns, all clean).
- Cache-version sweep and the emergency kill-switch are both verified in
  `docs/pwa/emergency-kill-switch.md` — real builds, real browser, real
  cache/registration state read back after each step, not asserted from
  reading the code.

## Not independently verified

A live, real chat stream (an actual `wss://api.flaregpt.io` connection)
sitting mid-answer while a real update-available toast is clicked — the
chat-safety logic itself is proven correct via the store-level test above
(the same `isChatGenerating` predicate, the same subscribe-and-defer path,
the same store actions a real stream drives), but that's a proof of the
mechanism, not an eyes-on observation of a live network stream and a
service-worker update racing each other in the same browser tab.

**Phase 3 is complete and production-ready.** The one genuine bug this
phase's own rigor surfaced (`SKIP_WAITING` never being handled) would have
made the entire update-prompt feature silently non-functional in
production — confirmed fixed, confirmed via the same empirical method that
found it.
