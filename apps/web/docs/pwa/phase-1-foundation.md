# PWA Phase 1 — Installable Foundation

## Decisions made during implementation, for later phases

### `start_url: "/"` — a real UX gap, deliberately not fixed here

`LandingPage.tsx` only navigates an already-connected visitor to `/app`
reactively, gated behind `awaitingConnectRef` — i.e. only right after they
click "Connect Wallet" *from that page*. There's no "already connected,
redirect straight to the dashboard" effect on plain page load. That means an
already-set-up user launching the installed PWA lands on the marketing
page every time, not their dashboard — not what a "native app-like"
launch should feel like (Linear/Notion don't show a marketing splash to a
logged-in user).

This is real, but it's not a Phase 1 (Foundation/Installability) concern —
it's exactly the "Open App vs Install button logic" territory the roadmap
already scoped into **Phase 4 (Install Experience)**. Behavior today is
identical to a normal first-time browser visit to `/`, which is what the
roadmap's own Phase 1 reasoning called for — not a regression, just a known
gap to close in Phase 4, not manufactured scope for this one.

### Why the service worker doesn't precache the app shell HTML

The roadmap's original Phase 1 wording was "precache the shell for `/` and
`/terms`." Implementing that turned up a real build-ordering conflict:
`vite-plugin-pwa`'s `injectManifest` step computes its precache manifest
during the `vite build` step itself — but this project's prerendering
(`prerender.ts`) runs as a *separate* step *after* `vite build` finishes.
By the time the service worker's manifest is built, the real prerendered
`/` and `/terms` content doesn't exist yet, only the pre-render shell does.

Resolved with a `NetworkFirst` navigation route instead (see `src/sw.ts`)
— functionally the same outcome (fast repeat loads, offline fallback)
without depending on build order at all: it caches whatever the browser
actually receives at request time rather than trying to predict it at
build time. Verified this actually works end-to-end: a page visited twice
(so the service worker is genuinely controlling the client, not just
installed) serves its real cached content when offline; a page that's
never been visited under an active service worker correctly falls through
to `offline.html` instead. That second case is expected, universal service
worker behavior, not a bug — the very first navigation that triggers a
service worker's own registration is inherently fetched before that worker
exists to intercept anything.

### What's precache vs. runtime-cached vs. deferred to Phase 2

- **Precached** (build-time, via `globPatterns: ["**/*.{css,webmanifest}"]`):
  the CSS bundle and `site.webmanifest` only — 2 entries, ~72KB.
- **Runtime-cached**: `/` and `/terms` navigations only, via the
  `NetworkFirst` route above.
- **Explicitly not cached at all by this phase**: JS chunks, images, fonts,
  any API response. That's Phase 2 (Smart Caching)'s job, with the
  sensitivity-tiered policy already written down in
  `docs/pwa/phase-0-foundations.md`.
