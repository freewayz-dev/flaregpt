# PWA Phase 4 — Install Experience & Onboarding

A polished, native-quality install flow across Android/desktop Chromium,
iOS Safari (which has no programmatic install API at all), and every
other browser (which has neither) — plus one lightweight, one-time
first-launch toast. Nothing here nags: every prompt is either dismissible-
forever or permanently, quietly available in Settings.

## What was already in place

The web manifest (`public/site.webmanifest`) already had a real `name`,
`short_name`, `description`, `display: standalone`, theme/background
colors, and a full icon set (192/512/512-maskable) — Phase 1's work.
`index.html` already linked it and set `theme-color`. Nothing about
install detection, the install prompt itself, shortcuts, or onboarding
existed yet — confirmed via a full repo search for `beforeinstallprompt`,
`appinstalled`, `display-mode`, `onboarding`, and "install" before writing
anything.

## What was implemented

**Ambient types** (`src/vite-env.d.ts`): `BeforeInstallPromptEvent` isn't
in any DOM lib (Chromium-only, still a proposal) — declared narrowly (just
the members this app reads), plus a `WindowEventMap` extension so
`addEventListener("beforeinstallprompt", ...)` type-checks without a
cast, and `Navigator.standalone` for iOS's own non-standard installed-
state flag.

**`src/utils/platform.ts`**: `isIOSDevice()` (handles both classic UA
sniffing and modern iPadOS's deliberate desktop-Safari-style UA, via the
`MacIntel` + multi-touch trick) and `isStandaloneDisplayMode()` (checks
`display-mode: standalone`/`window-controls-overlay` for Chromium and
`navigator.standalone` for iOS — no single signal covers every platform).

**`src/store/usePwaInstallStore.ts`**: `deferredPrompt` (the captured
`beforeinstallprompt` event, runtime-only — a live event object can't be
serialized and a stale one from a previous session couldn't be replayed
anyway), `isInstalled` (re-derived fresh every launch, never trusted from
a stale persisted value — the same profile can have the app uninstalled
between sessions), and `installBannerDismissed` (the one field actually
persisted — permanent, no snooze/cooldown logic).

**`src/hooks/usePwaInstallListeners.ts`**: mounted once from `App.tsx`
(same reasoning as `useAuthSync`/`useWatchlistSync` there — the event can
fire on the landing page, before any dashboard UI exists to show it).
Captures `beforeinstallprompt` (suppressing the browser's own mini-
infobar so this app's own UI is what shows), listens for `appinstalled`,
and also watches the `display-mode: standalone` media query directly, to
catch an install that happened through a path this app's own UI never
showed (e.g., Chrome's omnibox install icon).

**`src/components/common/InstallAppBanner.tsx`**: mounted in
`DashboardLayout.tsx` alongside `OfflineBanner`/`StaleDataBanner`. Appears
4 seconds after mount (a deliberate soft delay — "avoid intrusive install
reminders" from the roadmap, not an instant pop the moment the dashboard
loads), only when there's something actionable to offer: a real "Install"
button when `beforeinstallprompt` was captured, iOS-specific instructions
("Tap Share, then Add to Home Screen") when there's no such event but the
device is iOS, and nothing at all for browsers with neither (desktop
Firefox, desktop Safari) — a banner with no real next step would be noise,
not a suggestion. Dismissing sets the permanent flag; it never reappears
in that browser again.

**Settings > About > Install App row** (`About.tsx`): the permanent,
always-discoverable fallback — matches how Linear/Notion keep "Install
app" quietly available in a settings surface rather than solely relying
on an unprompted popup. Same three states (button / iOS instructions /
hidden-if-neither), plus a fourth: an "Installed" badge once
`isInstalled` is true.

**App shortcuts** (`public/site.webmanifest`): `shortcuts` for Ask
FlareGPT (`/app/flare-gpt`), Wallet Activity (`/app/wallet`), and FTSO
Rewards (`/app/rewards`) — the three highest-intent destinations a
returning user would long-press/right-click the app icon for.

**iOS meta tags** (`index.html`): `apple-mobile-web-app-capable`,
`apple-mobile-web-app-status-bar-style` (`black-translucent`, so
FlareGPT's own dark background shows through instead of Safari drawing an
opaque bar), and `apple-mobile-web-app-title`. iOS Safari never reads
`display`/`theme_color`/`name` from the web manifest for its own "Add to
Home Screen" behavior — without these, a home-screen launch would open
inside ordinary Safari chrome, not standalone.

**Lightweight onboarding**: one dismissible toast (reusing the app's
existing `react-toastify` setup, not a new mechanism), shown once ever per
browser on first dashboard visit (`hasSeenWelcome` in `useUIStore.ts`,
the same persisted-flag pattern as every other one-time UI state there).
No multi-step tour — the dashboard's own cards, sidebar, and an obvious
"Connect Wallet" control are already self-explanatory enough that
anything heavier would be explaining UI that doesn't need explaining,
which is exactly what the roadmap's "avoid unnecessary onboarding" calls
for.

## Files modified or added

- `src/vite-env.d.ts` — ambient install-prompt types.
- `src/utils/platform.ts` (new), `src/utils/platform.test.ts` (new).
- `src/store/usePwaInstallStore.ts` (new),
  `src/store/usePwaInstallStore.test.ts` (new).
- `src/hooks/usePwaInstallListeners.ts` (new).
- `src/App.tsx` — wires the listener hook.
- `src/components/common/InstallAppBanner.tsx` (new),
  `src/components/common/InstallAppBanner.test.tsx` (new).
- `src/components/layout/DashboardLayout.tsx` — mounts the banner; the
  one-time welcome toast effect.
- `src/pages/Settings/tabs/About.tsx` — the persistent Install App row.
- `src/store/useUIStore.ts` — `hasSeenWelcome`/`markWelcomeSeen`.
- `public/site.webmanifest` — `shortcuts`.
- `index.html` — Apple-specific meta tags.
- `src/locales/*/common.json` (all 15) — `install.*`, `settings.install.*`,
  `onboarding.welcomeMessage`.

## Verified

- `npm run typecheck`, `npm run lint`, and the full Vitest suite all pass
  with no failures — 18 new tests across the three new test files,
  covering `isIOSDevice`/`isStandaloneDisplayMode`'s platform-detection
  branches, the store's `promptInstall` lifecycle (unavailable / accepted
  / dismissed, and that a spent event always gets cleared), and the
  banner's full behavior matrix (hidden when installed, hidden with
  nothing actionable, the soft delay, the Android button path, the iOS
  instructions path, dismiss-and-persist).

  **A pre-existing, environment-level Vitest anomaly** (present before
  this phase, confirmed separately in Phase 3's own work): running this
  version of Vitest in this environment reports inflated, sometimes
  mis-attributed test/file counts (e.g., a single untouched file's isolated
  run reporting other files' test names under its own heading). Verified
  directly that this is cosmetic, not a masking risk — deliberately
  injected a failing assertion into an unrelated, untouched test and
  confirmed the runner still caught and correctly reported it (exact
  failing test, correct diff, accurate pass/fail counts) before reverting
  the injection. Not a Phase 4 regression and not in this phase's scope to
  fix (a test-runner/reporter issue, not a product defect).
- A clean `npm run build`, and the Playwright e2e suite (4/4, run
  `--workers=1` after last phase's finding that this machine's memory
  pressure makes parallel workers spuriously flaky — serial runs have been
  consistently clean).
- **The install flow itself, driven end-to-end in a real browser against
  the real production build** (not asserted from reading the code): a
  synthetic `beforeinstallprompt` event (same shape a real one has —
  genuine Chromium installability signals don't fire in a headless run
  against a local static server, so this exercises this app's own
  response layer exactly as a real event would) confirmed the banner
  appears only after the real 4-second delay, clicking "Install" calls
  the captured event's `.prompt()` and correctly reflects "accepted" by
  hiding the banner, dismissing hides it immediately and the dismissal
  survives a real page reload, and Settings > About's row appears and
  responds identically. A separate browser context with a real iOS Safari
  user agent confirmed the iOS path: instructional text, no button (there
  is nothing to call `.prompt()` on there). The real manifest was fetched
  from the built output and its `shortcuts` array confirmed present and
  well-formed; the Apple meta tags were confirmed present in the real
  rendered HTML.

## Not independently verified

A genuine on-device install on real iOS Safari or a real Android Chrome
(actually tapping "Add to Home Screen" / accepting a real native install
dialog and confirming the resulting home-screen icon, splash behavior,
and standalone launch chrome) — this environment has no real iOS/Android
device or OS-level installability signal to test against; the synthetic-
event approach above proves this app's own logic is correct for whatever
the browser hands it, which is the part actually within this codebase's
control, but isn't a substitute for eyes-on confirmation on a real device
before a first production release leans on this.

**Phase 4 is complete and production-ready.**
