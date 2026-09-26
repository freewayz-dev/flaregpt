# PWA Phase 9 — Push Notifications (Deferred)

Deferred, not skipped or forgotten. Blocked on infrastructure this
codebase genuinely doesn't have yet, not on any technical uncertainty
about how to build it:

- **No VAPID keys** — no public/private key pair generated or stored
  anywhere (would need to live in the backend's own secret store, not
  this frontend repo).
- **No subscription API** — the backend (`api.flaregpt.io`) has no
  endpoint to register/store a `PushSubscription` against an account.
- **No subscription storage** — nowhere in the backend's data model for
  "this account, on this device, wants pushes for X."
- **No notification delivery pipeline** — nothing server-side that
  decides *when* to actually send one (a reward becoming claimable, a
  governance proposal opening, a large incoming transfer, ...) or calls
  the Push API to do it.

Explicitly **not implemented as placeholder code** — no `PushManager.subscribe()`
call sitting unused, no speculative `notificationclick` handler in
`src/sw.ts`, no UI asking for permission that would just fail against a
non-existent backend. Building any of that now would be exactly the
"speculative infrastructure for a feature that doesn't exist yet" every
other phase in this project was told to avoid, and it would very likely
need to be *rebuilt*, not just wired up, once the real backend contract
(subscription payload shape, topic/category model, auth) is actually
defined — a guessed-at frontend shape locking in an API design the
backend team hasn't made yet is worse than no code at all.

## What unblocks this

1. Backend generates and holds a VAPID key pair; the public key is
   exposed to this frontend (an env var/config value, not hardcoded).
2. A real `POST /api/v1/notifications/subscribe` (or equivalent) endpoint
   that accepts a `PushSubscription` plus whatever preference/topic model
   the product actually wants (all rewards? just large ones? governance
   only?).
3. A real delivery pipeline server-side that decides when to call the
   Web Push protocol against a stored subscription.

Once those exist, Phase 9 becomes a normal, scoped PWA phase like every
other one in this project: `Notification.requestPermission()` +
`PushManager.subscribe()` in the frontend, a `push`/`notificationclick`
handler pair in `src/sw.ts`, and UI for managing the subscription — see
`src/pages/Settings/tabs/Notifications.tsx`, which already has the (today
non-functional, decorative-only) toggle UI shape this would plug into.
