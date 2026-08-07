# FlareGPT PWA — Implementation Index & Final Review

Eleven phases (0–10, with Phase 9 deferred), each independently audited
before writing code, each independently measured/tested before being
marked done. This file is the map — start here, then follow the links
below for any phase's full reasoning, exact files touched, and how it was
verified.

## Phase index

| Phase | Scope | Status |
|---|---|---|
| [0](phase-0-foundations.md) | Security/CSP/HSTS foundations | Done |
| [1](phase-1-foundation.md) | Installable foundation (manifest, icons, precache) | Done |
| [2](phase-2-caching.md) | Tiered API caching (financial/semi-static/never) | Done |
| [3](phase-3-updates.md) | Update lifecycle, chat-safe activation | Done |
| [4](phase-4-install.md) | Install prompt, shortcuts, onboarding | Done |
| [5](phase-5-offline.md) | Offline dashboard shell, cached-data UX | Done |
| [6](phase-6-mobile.md) | Safe areas, status bar, scroll, touch targets | Done |
| [7](phase-7-performance.md) | Bundle/image/font optimization, measurement tooling | Done |
| [8](phase-8-background-features.md) | Background Sync (evaluated, none built) | Done — no code |
| [9](phase-9-push-notifications-DEFERRED.md) | Push notifications | **Deferred** — backend doesn't exist |
| [10](phase-10-deep-linking.md) | Web Share API, deep-link fix | Done |
| — | [Emergency kill-switch](emergency-kill-switch.md) | Built, tested, documented |

## What this PWA actually does now

- **Installs** on Android/desktop Chromium (real `beforeinstallprompt`
  flow) and iOS (manual "Add to Home Screen," correctly themed via
  Apple's own meta tags) — a soft, dismissible-forever prompt plus a
  permanent Settings entry, never a nag.
- **Works offline for reading**: the dashboard shell itself loads offline
  (not just "shows an error"), cached financial data renders with an
  honest "showing cached data from N minutes ago" marker, and every
  action that needs a live connection disables itself with a reason
  instead of failing silently. No offline writes, no queued mutations —
  deliberately, per Phase 5 and Phase 8's own scope.
- **Updates safely**: a waiting service worker never force-activates
  itself — especially never mid-way through a live FlareGPT chat
  response — only on an explicit, chat-safety-gated user click.
- **Feels native on mobile**: safe-area-aware layout on notched devices,
  a status bar that matches the current theme instead of a fixed brand
  color, scroll that resets between pages the way a real app does, and
  touch targets sized for a thumb.
- **Is measurably lighter than it was**: 866KB of image weight cut, an
  unnecessary ~410KB chart-library preload removed from every page that
  never needed it, font payload trimmed to only the weights actually
  used — see Phase 7 for the real, measured numbers.
- **Lets you share** a wallet address, a donation address, a specific DeFi
  protocol position, or a transaction (via its permanent explorer link)
  through the real OS share sheet where available, clipboard copy
  everywhere else.
- **Has an emergency escape hatch**: a pre-written, pre-tested kill-switch
  service worker ready to deploy via one env var if a real incident ever
  needs it — not something to design under pressure for the first time.

## Phase 9 — why it's deferred, not built badly

Push notifications need a VAPID key pair, a subscription API, subscription
storage, and a delivery pipeline — all backend infrastructure that
doesn't exist yet. Building the frontend half now (permission prompts,
`PushManager.subscribe()`, a `push` handler in `sw.ts`) against a
guessed-at API shape would very likely need to be *rebuilt*, not
extended, once the real backend contract is defined — worse than not
building it. Full reasoning and the exact unblock conditions are in
[phase-9-push-notifications-DEFERRED.md](phase-9-push-notifications-DEFERRED.md).
`Notifications.tsx`'s existing (currently decorative) toggle UI is
already shaped for where this plugs in later.

## Known limitations, consolidated

Every phase disclosed its own gaps as they were found; collected here so
they're visible in one place rather than requiring a read of all eleven
documents:

- **No real device testing anywhere in this project.** This environment
  has no physical iOS/Android hardware and no WebKit runtime — every
  safe-area-inset value, splash-screen appearance, native share-sheet
  rendering, and install-flow visual was verified for *correctness of
  implementation* (real Chromium DevTools emulation, synthetic event
  dispatch, direct DOM/API inspection) but never eyes-on-a-real-phone.
  This is the single most important pre-production action below.
- **Chat conversation rename/delete aren't offline-gated** (Phase 5, disclosed
  again in Phase 8's audit) — clicking either while offline hits a
  generic error instead of an honest "you're offline" message, unlike
  every other mutation in the app. Low-stakes, low-frequency, but real.
- **This development environment has proven, real measurement noise**:
  Playwright worker-contention flakiness (Phase 5/6/7/10), a Vitest
  reporter test-count anomaly confirmed cosmetic via deliberate fault
  injection (Phase 4), and Lighthouse timing swings of 1.3s→2.4s with no
  code changes between runs (Phase 7). None of this is a product defect
  — it's this specific sandboxed machine — but it means every timing
  number in every phase doc should be read as "byte counts and
  request-ordering are trustworthy; absolute millisecond timings from
  this environment are not," a distinction each affected phase doc
  already makes explicitly.
- **No Lighthouse CI gate exists yet.** Phase 7 built the tooling
  (`rollup-plugin-visualizer`, dev-only Web Vitals logging) but adding an
  automated regression gate to `.github/workflows/` wasn't in that
  phase's scope and hasn't been done since.

## Recommendations before production deployment

1. **Real-device pass, once, before or immediately after shipping**: an
   actual iPhone (Safari, installed to home screen) and an actual Android
   phone (Chrome, installed). Specifically check: safe-area insets on a
   genuinely notched device, the install flow end-to-end, the native
   share sheet actually opening (not just the API being called), and the
   splash screen on cold launch. Everything else in this project has been
   verified as rigorously as a real-device-less environment allows; this
   is the one category of check nothing here could substitute for.
2. **Run Lighthouse against the real production deploy**, not localhost —
   this environment's own numbers are explicitly flagged as unreliable in
   Phase 7; the real Vercel deployment, over a real network, is the first
   trustworthy full Lighthouse run this project will have had.
3. **Exercise the emergency kill-switch against real staging
   infrastructure once**, deliberately, before it's ever needed for a
   real incident — it was built and tested against a local static server
   (Phase 3), never against actual Vercel hosting/CDN behavior.
4. **Decide on Phase 9's timeline** against the real product roadmap — the
   backend work it's blocked on (VAPID keys, a subscription endpoint,
   storage, a delivery pipeline) is likely a multi-sprint backend
   investment in its own right, worth scoping as its own project rather
   than assumed to be a quick follow-up to this frontend work.
5. **Consider a CI Lighthouse/bundle-size budget** now that Phase 7 built
   the measurement tooling — a budget that fails a PR when the bundle
   grows past a threshold is what actually prevents the kind of silent
   regression (like the eager `vendor-charts` preload Phase 7 found by
   hand) from recurring unnoticed.
6. **The disclosed chat rename/delete offline gap** (above) is a genuine,
   if minor, product decision to make: fix it (mirroring Phase 5's
   `offlineBlocked` pattern exactly, a small change) or explicitly accept
   it as-is. Either is reasonable; leaving it silently unconsidered isn't.

## Verification standard held across every phase

Every phase in this project was measured, not assumed: real Lighthouse
runs (Phase 7), real Playwright sessions against real production builds
served through the same static server that faithfully replays
`vercel.json` (Phases 2, 3, 4, 5, 6, 7, 10), real byte-size diffs, real
`PerformanceObserver`/network-request traces, and — more than once —
empirical testing that caught a real bug reasoning alone would have
missed entirely: Phase 3's `SKIP_WAITING` handler that silently made the
entire update-prompt feature a dead button, Phase 3's emergency-SW
infinite-reload loop, and Phase 7's eagerly-preloaded, never-needed chart
library. That standard — verify in a real browser against real build
output, don't trust the reasoning alone — is the thing worth carrying
into whatever comes after this roadmap, Phase 9 included.
