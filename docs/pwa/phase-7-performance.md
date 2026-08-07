# PWA Phase 7 — Performance Hardening & Measurement

Every change in this phase is backed by a real measurement — a Lighthouse
run, a byte count, a live `PerformanceObserver` trace — not a guess about
what "should" be slow. Several things guessed-at up front turned out to
already be solved; one real, non-obvious bug (an eagerly-preloaded,
never-needed chart library on the marketing page) only showed up once
actually measured.

## What was already implemented

A full audit before writing anything found real, existing work: vendor
chunk splitting (`vendor-react`/`vendor-charts`/`vendor-motion`) with
documented rationale in `vite.config.ts`, every route already
`lazy()`-loaded, dashboard-family skeletons already dimensionally matched
to their real content (confirmed both by reading the code and, this
phase, by directly measuring), `MotionConfig`'s `reducedMotion` already
global, zero whole-store Zustand subscriptions anywhere (every consumer
already uses narrow selectors), and chat message components already
`memo()`-ed specifically to survive per-token streaming updates without
re-rendering siblings. None of that needed touching.

**Confirmed gaps**: no bundle-analyzer tooling, no Web Vitals/Lighthouse
measurement of any kind, no image-format optimization (all PNG/JPEG),
several `<img>` tags missing `loading`/`width`/`height`, untrimmed Google
Fonts weight ranges, and an unexamined `vite.config.ts` `modulePreload`
default that turned out to be actively harmful.

## What was implemented, and why

**Removed `vendor-charts` from the eager `modulePreload` list**
(`vite.config.ts`). The single biggest, most concrete finding of this
phase, found by actually running Lighthouse against the built landing
page rather than assuming the existing route-level `lazy()` splitting was
enough: Vite's default modulepreload generation doesn't do per-route
reachability analysis for a single-entry SPA — it treats every
`manualChunks` vendor bucket as "probably needed soon" and injects a
`<link rel="modulepreload">` for all of them into the one shared HTML
head, `vendor-charts` (recharts + d3, ~410KB) included, even though nothing
the landing page (or `App.tsx`, or `main.tsx`) ever statically imports
reaches recharts — only the lazy dashboard pages that actually render a
chart do. Confirmed directly via Chrome's own network-request trace: in
the unmodified build, `vendor-charts` was discovered by the HTML preload
scanner in the *same initial burst* as `vendor-react` and the main JS
(~60ms), competing for bandwidth with the actually-critical fonts/CSS on
every single page load — landing included, and `app-shell.html` (shared
by every `/app/*` route, including the many that never render a chart:
Settings, Wallets, Loops, FlareGPT, Donate) too, since it's a raw copy of
the same head. A `modulePreload.resolveDependencies` filter now excludes
it specifically; `vendor-react` and `vendor-motion` correctly stay
preloaded (React and `App.tsx`'s own always-mounted `<MotionConfig>` are
genuinely needed by every route). Chart-heavy pages lose nothing: their
own `lazy()` chunk statically imports the chart components that pull in
recharts, so Rollup's normal dynamic-import machinery still fetches it
alongside that page's own chunk the moment it's actually navigated to —
this only removes the unconditional, upfront fetch for every page that
never needed it.

**Image optimization** — converted the largest, most disproportionate
offenders to WebP via `sharp-cli` (a real tool, not a guess at savings):

| Asset | Before | After | Saved |
|---|---|---|---|
| `showcase/` (4 landing screenshots) | 725 KB | 112 KB | 613 KB (85%) |
| `wallets/rabby.png` (rendered at 20-24px, shipped at full size) | 136 KB | 6.7 KB | 129 KB (95%) |
| `wallets/MetaMask_Fox.svg.png` | 72 KB | 28 KB | 44 KB (61%) |
| `icons/image.png` (980×980, rendered at 24px) | 75 KB | 3.4 KB | 72 KB (95%) |
| `wallets/icon.png` (768×768, rendered at 24px) | 11 KB | 2.6 KB | 8 KB (76%) |
| **Total** | **1,019 KB** | **153 KB** | **866 KB (85%)** |

The two oversized icons were also resized to 96×96 (a genuine 4x headroom
over their actual ~24px CSS render size for retina displays, not a
guess) before WebP conversion. No `<picture>`/PNG fallback anywhere —
this project's own `build.target: es2020` already assumes evergreen
browsers, all of which have supported WebP for years.

Also added the missing `loading="lazy"`/`width`/`height` to the two
partner-logo `<img>` tags on the landing page (below the fold, previously
had neither). Left `SpectraIcon`/`FirelightIcon` alone after checking:
both accept a caller-controlled `className` for variable sizing, so
there's no single correct width/height to hardcode, and their source
files are already small (4.4KB/2.4KB) — not a real gap.

**Font weight trimming** (`index.html`) — grepped every `font-*` Tailwind
utility class actually used in `src/` before touching anything: Inter
was requesting all 9 weights (100–900) but the app only ever applies
400/500/600/700/900; Plus Jakarta Sans (the display face) was requesting
500/600/700 but every `font-display` heading pairs with `font-semibold`
or `font-bold` only, never `font-medium`. Trimmed to exactly what's used
— 5 of 9 Inter weights, 2 of 3 Plus Jakarta Sans weights.

**Bundle analyzer** (`rollup-plugin-visualizer` + `npm run build:analyze`)
— opt-in only (gated behind `VITE_ANALYZE=1`, same env-var-gated pattern
`vite.config.ts` already uses for the emergency-kill-switch build), so it
costs nothing on a normal build/deploy. This is what actually found the
`modulePreload` issue above, and is now available for the next person to
use rather than guess.

**Dev-only Web Vitals console reporter** (`src/utils/webVitals.ts`,
wired from `main.tsx` behind `import.meta.env.DEV`) — logs LCP/CLS/INP/
FCP/TTFB with a good/needs-improvement/poor verdict (web.dev's own
published thresholds, not invented ones) to the console during
`npm run dev`. Deliberately not analytics: nothing is transmitted or
persisted anywhere, ever; it's a local debugging aid, dynamically
`import()`-ed specifically so it costs zero production bytes even if
this file were ever reached from the wrong place by mistake.

## What was investigated and found to need no change

**Skeleton-to-content CLS matching** — re-verified `FlrPriceChartSkeleton`
against the real `FlrPriceChart`: both use the identical `h-56 sm:h-64`
chart-area height. Already correct.

**Framer-motion usage** — of the 9 files importing it, 6 use
`AnimatePresence`/auto-height animation (accordions, cross-fades) that
plain CSS genuinely can't do cleanly; `MessageList.tsx`'s per-message
`motion.div` only fires on mount/unmount (not per streaming token, since
`AssistantMessage`/`UserMessage` are already `memo()`-ed and update in
place). No conversion candidates found beyond the one already-documented
prior conversion (`FadeIn`, landing-page-only). Forcing a rewrite here
without a measured problem would be exactly the "premature optimization"
this phase was told to avoid.

**A Lighthouse-flagged CLS of 0.182 on `/app`** — investigated rather
than either dismissed or chased blindly. Lighthouse's own root-cause
attribution wasn't populated for this run, so a direct
`PerformanceObserver({type: "layout-shift"})` trace was captured in a
fresh session instead (the actual browser-level ground truth, not a
derived Lighthouse metric). Two consecutive runs of that trace agreed
exactly: **0.0294 total** (comfortably within web.dev's "good" <0.1
threshold), and none of its three real sources were the chart element
Lighthouse's single-run audit had flagged. This environment reaches the
*real* `api.flaregpt.io`/CoinGecko backends over a live network (nothing
here is mocked) — async data arriving at a different moment relative to
paint on any given run is expected, real-world behavior, not a
reproducible code defect, and the standard mitigation for it (skeletons
sized to match final content, preventing the shift from mattering even
when it happens) is already in place and confirmed correct above.
Reporting the honest, reproducible number here rather than either the
scarier one-off Lighthouse figure or a false "nothing to see."

## Files modified or added

- `vite.config.ts` — `modulePreload.resolveDependencies`, the
  `rollup-plugin-visualizer` plugin (opt-in).
- `index.html` — trimmed font weight lists (with the grep-based reasoning
  documented inline).
- `src/pages/LandingPage.tsx`, `src/components/common/ConnectWalletModal.tsx`
  — WebP image imports, `loading`/`width`/`height` on partner logos.
- `src/assets/showcase/*.webp`, `src/assets/wallets/rabby.webp`,
  `src/assets/wallets/MetaMask_Fox.svg.webp`, `src/assets/wallets/icon.webp`,
  `src/assets/icons/image.webp` (new); the five superseded PNGs removed.
- `src/utils/webVitals.ts` (new, + test), `src/main.tsx` — dev-only Web
  Vitals reporter.
- `package.json` — `build:analyze` script, `rollup-plugin-visualizer` and
  `web-vitals` as devDependencies.

## Measured

- `npm run typecheck` (both configs), `npm run lint`, and the full Vitest
  suite (432 tests, 26 files, including a new focused test for the Web
  Vitals threshold logic) all pass. Clean `npm run build`, and 4/4
  Playwright e2e — including the spec that exercises real chart rendering
  on the wallet-flow page, confirming the `modulePreload` change didn't
  regress chart loading.
- **Real, environment-independent byte savings** (the primary evidence
  this phase leans on, deliberately — see the honesty note below): 866KB
  of image weight removed (85% reduction on the touched files), 4 of 9
  Inter font-weight files and 1 of 3 Plus Jakarta Sans weight files no
  longer requested, `vendor-charts` (~410KB) no longer in either HTML
  entry's eager preload list — confirmed via `grep` against the real
  built output, not the source config.
- **Network-request-order evidence** (real Chrome trace data, not
  simulated): before the `modulePreload` fix, `vendor-charts` was
  discovered in the same ~60ms initial burst as the critical fonts/CSS;
  after, it moved to a separately-timed fetch outside that burst — a real
  request-priority change, verified by inspecting `rendererStartTime`
  across every request in both a before and after Lighthouse trace, not
  asserted from the config alone.
- **Honesty about this measurement environment**: absolute Lighthouse
  timing numbers (LCP/FCP under default throttling) were found to be
  unusable here — an initial throttled run reported a 15-second LCP for a
  page that's mostly static prerendered HTML, and even *unthrottled* runs
  on this same machine swung from 1.3s to 2.4s across back-to-back runs
  with no code changes in between. This matches the same class of
  environment-driven measurement noise already documented in this
  project's own Phase 5/6 work (Playwright worker contention, a Vitest
  reporter count anomaly) — not new to this phase, and not something a
  code change here can fix. Byte counts, request ordering, and the
  `PerformanceObserver` CLS trace don't depend on CPU timing the same way
  and were used as the primary, trustworthy evidence throughout this doc
  instead of absolute Lighthouse scores.

## Not independently verified

A Lighthouse/Web-Vitals run on real mobile hardware over a real (non-
localhost) network connection, where the `modulePreload` fix's actual
latency benefit (not just its request-priority reordering, which *is*
confirmed) would be directly observable — this environment's near-zero
localhost latency compresses the real-world gap between "preloaded
immediately" and "fetched 25ms later" down to a difference too small for
this specific setup to demonstrate, even though the underlying mechanism
(a real browser's preload scanner competing for a real, limited number of
early connections) is well-documented, standard behavior, not specific to
this app.

**Phase 7 is complete and production-ready.** Every change here is either
a measured, real byte reduction, a confirmed request-priority fix, or a
new piece of ongoing measurement tooling — nothing was changed on
assumption alone, and several suspected-but-unmeasured "problems" (the
skeleton dimensions, the framer-motion usage, the flagged CLS number)
were investigated and found to already be correct or not reproducible,
rather than "fixed" without evidence they were ever broken.
