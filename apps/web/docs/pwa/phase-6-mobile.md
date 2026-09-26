# PWA Phase 6 — Mobile-Native Feel

Making the installed PWA feel like a native app rather than a website in a
frame: safe-area-aware layout on notched devices, a status bar that
matches the current theme instead of a fixed brand color, scroll that
resets on navigation the way every native screen does, and touch targets
sized for a thumb instead of a cursor.

## What was already implemented

`display: standalone` + `display_override`, the Apple/mobile-web-app meta
tags, and icon set (Phase 4) already covered the installability side of
"feels native." `Composer.tsx` already had one `env(safe-area-inset-bottom)`
use. `Toggle.tsx` already established the invisible-hit-area pattern this
phase reuses. A full repo audit before writing anything found that was
the extent of it — everything else below (safe areas everywhere else,
dynamic status-bar color, scroll restoration, every other touch target)
didn't exist yet.

## What was implemented, and why

**Safe-area insets, applied where content actually meets a screen edge**
— audited every `fixed`/`sticky` element and full-screen mobile surface
first, then added `env(safe-area-inset-*)` at each:
- `DashboardLayout.tsx`'s root gets `pt`/`pl`/`pr` — whichever row ends up
  first (a banner, or Navbar's header if none are showing) shifts below a
  notch together, without touching every banner individually.
- `Navbar.tsx`: the mobile dropdown menu, its backdrop, the FlareGPT FAB,
  and its hint bubble are all `fixed` (viewport-anchored, *not* affected
  by the root's own padding), so each got its own matching inset —
  including re-deriving the dropdown/backdrop's hardcoded `top-16`/`top-12`
  offsets, which would otherwise have sat under Navbar's own now-shifted
  header on a notched device.
- `Sidebar.tsx`'s mobile drawer, `FlareWidget.tsx`'s mobile full-screen
  panel, and `ConnectWalletModal.tsx`'s mobile bottom sheet each got their
  own insets for the same "fixed, not affected by anything else" reason.
- `LandingNavbar.tsx` too — the manifest's `start_url` is `/`, so the
  landing page is what a cold launch of the installed app actually shows
  first, not `/app`.
- Bottom insets deliberately *not* added to the DashboardLayout root or
  FlareWidget's panel — Composer.tsx and the FAB already carry their own,
  and stacking a second one there would double the gap under them.

**`theme-color` now matches the current theme** instead of a fixed brand
pink always. A native app's status bar/task-switcher chrome blends into
whatever's on screen; this app's manifest/meta tags previously left it
pink even in dark mode, or in light mode — a real, visible mismatch, not
a cosmetic nitpick. `applyThemeColorMeta()` (`useUIStore.ts`, exported so
it's one function instead of duplicated logic) is called from three
places that all needed to agree: `theme-init.js`'s pre-paint script, the
in-app Settings > Appearance toggle (`setAppearance`), and the
OS-preference-change listener (`App.tsx`) — the same three places that
already independently applied the `dark` class, now kept in sync with the
meta tag too.

**Scroll restoration.** React Router's own `<ScrollRestoration>` needs a
data router (`createBrowserRouter`); this app deliberately stays on plain
`<BrowserRouter>` (an explicit choice from the React Router v8 migration,
not revisited here) — and it wouldn't have applied anyway, since this
app's actual scroll container is `main` (`overflow-y-auto`), not `window`
(the root shell is a fixed `h-dvh`). Confirmed via audit: navigating to a
genuinely different page previously left you exactly as scrolled as the
last page — a real, jarring bug, not a nice-to-have. `DashboardLayout.tsx`
now resets `main`'s scroll position to top on every `location.pathname`
change.

**Touch targets**, using Toggle.tsx's own existing invisible-hit-area
technique (an absolutely-positioned `::before` with negative insets) so
the *visible* size of each control stays exactly as designed — growing
padding directly would have made `InstallAppBanner`'s slim strip taller,
or the Connect Wallet dialog's header heavier, purely to satisfy a tap-
target guideline with no visible-design reason to. Fixed, worst-to-least:
`InstallAppBanner`'s dismiss (had zero padding — the worst offender, a
~14px raw hit area), `ConnectWalletModal`'s close button, `Sidebar`'s
mobile close button, `Navbar`'s 3-dot trigger, hamburger, and hide-
balances toggle.

**Global mobile-interaction polish** (`index.css`): `-webkit-tap-highlight-color:
transparent` (every interactive element here already has its own
deliberate hover/active state; the browser's generic gray flash on top
just reads as unstyled), `touch-action: manipulation` on every
button/link/`role="button"` (removes the ~300ms tap delay and disables
double-tap-zoom on controls that were never meant to be zoomed),
`overscroll-behavior-y: none` on `html`/`body` (stops the whole-page
rubber-band bounce at the true browser-chrome level — distinct from and
complementary to the `overscroll-contain` already set on individual
scroll containers, which only stops scroll *chaining*).

## Explicitly not done

No fullscreen mode, orientation locking, Dynamic Island integration, or
custom pull-to-refresh — none asked for, none built. No hand-generated
`apple-touch-startup-image` splash images per iOS device size: confirmed
the manifest already has everything Safari's own auto-generated splash
(icons, `background_color`, `name`) needs, and iOS has supported that
auto-generation since 11.3 — hand-rolling ~20 pixel-exact PNGs for a
result modern iOS already produces on its own would be disproportionate
effort for this phase, not a gap.

## Files modified or added

- `src/components/layout/DashboardLayout.tsx`, `Navbar.tsx`, `Sidebar.tsx`
  — safe-area insets, scroll restoration.
- `src/components/common/FlareWidget.tsx`, `ConnectWalletModal.tsx`,
  `InstallAppBanner.tsx`, `LandingNavbar.tsx` — safe-area insets and/or
  touch-target fixes.
- `src/index.css` — global tap-highlight/touch-action/overscroll rules.
- `index.html`, `public/theme-init.js`, `src/store/useUIStore.ts` (+ new
  test), `src/App.tsx` — dynamic `theme-color`.

## Verified

- `npm run typecheck`, `npm run lint`, and the full Vitest suite pass — a
  new test file (`useUIStore.test.ts`) pins `applyThemeColorMeta` and its
  `setAppearance` integration directly.
- A clean `npm run build`, and the 4-spec Playwright suite (4/4 — the one
  known, pre-existing Recharts/resource-contention flake from earlier
  phases reproduced once under parallel workers, confirmed clean again in
  isolation, same as every prior phase's finding).
- **Driven in a real browser against the real production build, emulating
  an iPhone 14 Pro viewport/UA**, not asserted from reading the code:
  `getComputedStyle` confirmed `-webkit-tap-highlight-color: rgba(0,0,0,0)`,
  `overscroll-behavior-y: none`, and `touch-action: manipulation` are all
  actually applied, not just written. Toggling Light/Dark in the real
  Settings UI confirmed `theme-color`'s `content` attribute actually
  changes (`#F0F4F9` / `#101115`). Scrolling `main` down, then navigating
  to a different page via the real mobile Sidebar, confirmed `scrollTop`
  resets to `0`. Dispatching a synthetic `beforeinstallprompt` (same
  technique as Phase 4's own verification) to surface
  `InstallAppBanner`, then clicking 10px *outside* its visible 14×14
  icon but inside the documented invisible hit area, confirmed the
  banner actually dismisses — proving the pseudo-element hit-area
  expansion works in a real browser, not just in theory.
  - **Honest limitation, not glossed over**: Chromium's `env(safe-area-inset-*)`
    resolves to `0px` on this emulated device (confirmed both directly —
    `DashboardLayout`'s computed `padding-top` — and via a fallback-value
    probe: `CSS.supports('padding-top', 'env(safe-area-inset-top)')`
    returns `true`, but `env(safe-area-inset-top, 33px)` still resolves to
    `0px`, meaning Chromium treats the variable as *defined-and-zero*, not
    *undefined*, on a non-notched/emulated viewport — correct, standard
    behavior, not a sign of missing support). This environment has no real
    notched hardware or a WebKit engine to observe actual nonzero insets
    against; what's verified is that the CSS is syntactically valid,
    supported, computes without error, and doesn't regress the zero-inset
    (i.e. every non-notched device, which is most of them) case, which the
    full click-through/navigation flows above and a visual screenshot both
    confirm render normally.

## Not independently verified

Actual nonzero safe-area-inset behavior on real notched hardware (no
physical device or WebKit runtime in this environment — same category of
gap noted in Phases 4 and 5). iOS's auto-generated splash screen's real
on-device appearance.

**Phase 6 is complete and production-ready**, with the safe-area behavior
specifically caveated above as verified-for-correctness-of-implementation
rather than verified-on-real-hardware.
