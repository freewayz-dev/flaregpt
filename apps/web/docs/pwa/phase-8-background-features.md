# PWA Phase 8 — Background Features

This phase is an evaluation, not a feature build. The roadmap's own
wording anticipates that outcome directly: "Implement Background Sync
only for real, queueable non-financial actions **if any exist**" and
"Evaluat[e] Periodic Background Sync as an **optional** enhancement." Both
were audited thoroughly against this app's actual, current mutation
surface — not assumed for or against — and neither cleared the bar for
"genuinely provides value" here. No runtime code changes came out of this
phase; the deliverable is the evaluation itself, so the next engineer who
wonders "should this app use Background Sync?" has a real, reasoned
answer instead of re-deriving it (or worse, building it speculatively).

## Background Sync — evaluated, not implemented

Audited every mutation in the app (`useMutation` calls, plus every
mutation-shaped action that isn't one — wallet connect, sign-in, chat
send) to find any genuine "queueable non-financial action":

| Action | Why it's not a fit |
|---|---|
| Watchlist add/rename/remove (signed-in) | Already deliberately **blocked, not queued**, while offline (Phase 5's `offlineBlocked` gate) — a settings edit landing silently minutes or hours later, with the user no longer present to see it happen, is worse UX than an immediate "you're offline" message. Reversing that decision here would need its own strong justification, and there isn't one. |
| Gas Sniper enable/disable/approve | Financial-adjacent automation control (moves real claim-execution permissions on-chain) — explicitly excluded by this phase's own scope. |
| Wallet connect, sign-in | Need a live, interactive wallet handshake/signature in the moment — structurally incompatible with "retry silently later, possibly after the tab is closed." |
| Chat send | A live WebSocket stream, not a queueable POST — Background Sync's retry model doesn't apply to it at all. |
| Clear synced conversations | Destructive. Queuing a destructive action to fire later, unattended, is a real risk, not a convenience. |
| Notifications toggles | No backend wiring exists at all (confirmed in `Notifications.tsx` — decorative only). Nothing to sync. |
| DeFi protocols, rFLR vesting, Donate | Entirely read-only or receive-only; no mutation exists. |

The two mutations with no explicit offline gate today —
`useRenameConversation`/`useDeleteConversation` — were a disclosed,
deliberate Phase 5 scope decision ("lower-stakes... not covered," per
that phase's own report), not a Background Sync candidate: queuing a
rename/delete that lands whenever connectivity happens to return would
need its own new infrastructure (an IndexedDB-backed queue, since the
service worker has no access to the page's React Query/Zustand state; SW-
side handling of an auth token that could easily expire before the sync
event ever fires) to correctly build — real, non-trivial new
infrastructure for a rare, low-stakes edge case. That's a Phase 5-shaped
foreground-gating gap, not a Phase 8 background-sync opportunity; noted
here for visibility, not fixed in this phase (out of this phase's own
scope, per the roadmap's "don't pull in later/other-phase work" instruction).

**Conclusion: no genuine queueable non-financial action exists in this
app today.** Nothing implemented. `src/sw.ts` has no `sync` event
listener, and no `registration.sync.register(...)` call exists anywhere
— confirmed, not just left alone by omission.

## Periodic Background Sync — evaluated, not implemented

Two independent reasons, either of which would be sufficient alone:

1. **Support is narrow enough to be a poor investment on its own.**
   Chromium only (desktop and installed Android PWAs) — zero support in
   Safari/iOS, zero in Firefox — and gated behind the browser's own
   site-engagement heuristics, not something this app can request or rely
   on directly.
2. **A real architectural mismatch with this app's own privacy
   boundary.** The only data actually worth refreshing in the background
   is per-wallet (balances, positions, rewards) — but the service worker
   has no access to *which* wallet to fetch for without new plumbing that
   would cross the exact line Phase 2 deliberately drew: `/api/v1/auth/*`,
   watchlist, and chat are `NetworkOnly` specifically so the service
   worker never touches account-scoped state, avoiding any risk of
   cross-account leakage in a shared browser profile. A periodic sync
   handler would either need to read that same sensitive state (undoing
   a deliberate Phase 2 security decision) or restrict itself to the
   handful of genuinely public endpoints (gas price, network status) —
   which are already `StaleWhileRevalidate` and refresh naturally the
   moment the app is opened, so a periodic background fetch of just those
   would add real implementation and testing surface (permission-request
   UX, feature detection, a new `periodicsync` handler, a narrow and
   hard-to-test support matrix) for benefit that's already delivered by
   the existing foreground mechanism.

**Conclusion: not implemented.** No feature-detection helper for
`'periodicSync' in ServiceWorkerRegistration.prototype` was added either
— writing detection code for a feature this app isn't using would itself
be exactly the "speculative infrastructure for future features that do
not yet exist" this phase was told to avoid.

## Foreground refresh — confirmed intact, still the primary mechanism

Re-read `src/main.tsx`'s `QueryClient` construction directly rather than
trusting memory of Phase 5's own change:

```js
queries: {
  refetchOnWindowFocus: true,   // unchanged
  retry: retryUpTo(1),           // unchanged
  networkMode: "offlineFirst",   // Phase 5's fix, still in place
}
```

`refetchOnReconnect` is not overridden anywhere in the repo (grepped) —
it stays at TanStack Query's own default (`true`), driven by its
`onlineManager` listening to the real `online` browser event. Between
`refetchOnWindowFocus`, `refetchOnReconnect`, and `networkMode:
"offlineFirst"` (which is what lets a query's first attempt actually
reach the service worker's own cache fallback while offline, see Phase
5), the existing foreground-driven refresh path is what does — and
should keep doing — essentially all of the "get fresh data" work in this
app; there was never a foreground-vs-background tradeoff to make here,
because nothing else was ever built to compete with it.

## Files modified or added

- `docs/pwa/phase-8-background-features.md` (this file) — the entire
  deliverable. No `src/` changes.

## Verified

- Re-ran `npm run typecheck` (both configs), `npm run lint`, and the full
  Vitest suite (432 tests, 26 files) against the current `main`
  (unmodified by this phase) — all pass, confirming this phase introduced
  no regression because it introduced no code. Phase 5's own offline-
  gating tests (`GasSniperCard.test.tsx`, `Wallets.test.tsx`,
  `Composer.test.tsx`, `ConnectWalletModal.test.tsx`,
  `DataStorage.test.tsx`) already exercise real online/offline
  transitions against this exact `networkMode`/`refetchOnWindowFocus`
  configuration and continue to pass, which is real (if indirect)
  evidence the foreground-refresh path still works as intended, not just
  that the config line is still textually present.
- Repo-wide grep confirmed zero existing `sync`/`periodicsync` references
  anywhere in `src/`, both before this phase's audit and unchanged after
  it (nothing was added).

## Not independently verified

Nothing — there is no new runtime behavior in this phase to verify beyond
the configuration re-read and existing test suite above.

**Phase 8 is complete.** "Production-ready" doesn't quite apply in the
usual sense, since nothing shipped — the honest status is: evaluated
thoroughly, correctly built nothing, and documented why, which is exactly
what this phase's own roadmap asked for.
