// Imported from "vitest/config" rather than plain "vite" — a type-safe
// superset that adds the `test` key below; functionally the same
// `defineConfig` either way, but this is Vitest's own recommended import
// so tooling understands the `test` field.
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { execSync } from "node:child_process";
import path from "node:path";

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;

// Emergency kill-switch deploy toggle — see docs/pwa/emergency-kill-switch.md.
// Flipping this to "1" for a build (`VITE_PWA_EMERGENCY_SW=1 npm run build`)
// swaps in src/sw.emergency.ts in place of the normal src/sw.ts, with no
// code edits under incident pressure. Off (the default) for every normal
// build and deploy.
const EMERGENCY_SW = process.env.VITE_PWA_EMERGENCY_SW === "1";

// A browser's service-worker update check is a byte-comparison of the
// compiled service-worker script against whatever's currently installed —
// see src/sw.ts's own use of this value for the full reasoning. This is
// what makes that comparison meaningful on every deploy, not just ones that
// happen to touch CSS or sw.ts's own logic.
//
// `VERCEL_GIT_COMMIT_SHA` is Vercel's own documented build-time env var for
// exactly this purpose — but it's only populated when a project has
// "Automatically expose System Environment Variables" enabled in its
// Vercel dashboard settings, a per-project toggle this file can't see or
// assume is on. `git rev-parse HEAD` is the fallback specifically because
// it needs no such toggle: Vercel's build container always has the real
// repository checked out to run the build at all, so this resolves
// correctly there regardless of that setting, and identically in any local
// clone — same commit in, same id out, changing only when a real commit
// does. The final `"dev"` fallback is only for the true edge case of
// building from a source tree with no `.git` at all (e.g. a downloaded
// tarball) — without it, that scenario would otherwise fail the build
// outright over a value that only ever needs to be *some* string.
function resolveBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: __dirname }).toString().trim();
  } catch {
    return "dev";
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: "default",
        ref: true,
        svgo: false,
        titleProp: true,
      },
      // Bare "**/*.svg" alone is enough for real Vite dev/build — confirmed
      // in the browser and via Playwright e2e — but Vitest's own transform
      // pipeline resolves module ids differently and doesn't match a
      // `?react`-suffixed import (e.g. `mxrpy.svg?react`, used by
      // protocols.tsx — see its own vite-env.d.ts comment) against that
      // pattern, silently returning the raw asset URL string instead of a
      // component. That's invisible until a test actually renders one of
      // those two icons: React then tries to use the string as an element
      // tag name and throws. Explicit `?react` alongside the bare pattern
      // fixes both environments identically.
      include: ["**/*.svg", "**/*.svg?react"],
    }),
    // `injectManifest`, not the default `generateSW` — this project needs
    // real control inside the service worker (the navigation-route/
    // offline-fallback logic in src/sw.ts now, careful update-timing
    // coordination with the chat WebSocket in a later phase) that
    // `generateSW`'s declarative-config-only approach can't express.
    VitePWA({
      strategies: "injectManifest",
      // Explicit, not left to the plugin's default: a waiting service
      // worker must NOT activate itself automatically ("autoUpdate" would
      // do exactly that). Deciding when it's safe to activate — after
      // confirming the chat WebSocket has no active stream — is Update
      // Management's job, not this phase's; "prompt" is what leaves that
      // decision available to make later instead of foreclosing it now.
      registerType: "prompt",
      srcDir: "src",
      filename: EMERGENCY_SW ? "sw.emergency.js" : "sw.js",
      injectManifest: {
        // Deliberately narrow — see src/sw.ts's own top-of-file comment
        // for why JS chunks and the prerendered HTML shells aren't
        // precached here (a real build-ordering conflict with this
        // project's separate post-build prerender step, not an oversight).
        globPatterns: ["**/*.{css,webmanifest}"],
        // sw.emergency.ts deliberately contains no `self.__WB_MANIFEST`
        // placeholder — it deletes every cache, it doesn't populate one —
        // so workbox-build's own injectManifest step has nothing to inject
        // into and hard-fails with "injection point not found" if left to
        // its default. Explicitly unsetting injectionPoint here (not just
        // omitting it — Object.assign against the plugin's own default
        // still needs the key present to win) makes the plugin skip that
        // step entirely for this build, matching what sw.emergency.ts
        // actually needs.
        ...(EMERGENCY_SW ? { injectionPoint: undefined } : {}),
      },
      // This project already hand-maintains public/site.webmanifest
      // (linked from index.html) rather than having the plugin generate
      // one from config — avoids the same manifest existing in two places
      // that could drift out of sync.
      manifest: false,
      // Registered explicitly from main.tsx via the `virtual:pwa-register`
      // module instead — the plugin's own auto-injected registration
      // snippet is an inline <script>, which the app's CSP (`script-src
      // 'self'`, no `'unsafe-inline'` — see vercel.json) would block
      // outright. Registering from real bundled app code sidesteps that
      // entirely rather than needing an exception carved into the policy.
      injectRegister: false,
      // No service worker at all under `npm run dev` — standard practice,
      // and specifically avoids a stale dev-mode SW serving cached
      // responses over actual dev-server output while iterating.
      devOptions: { enabled: false },
    }),
    // Opt-in only (`npm run build:analyze`) — writes a real, inspectable
    // treemap of what's actually in each chunk after minification/
    // gzip/brotli, rather than guessing chunk composition from import
    // lists. Skipped on every normal build (adds real analysis time for
    // zero benefit on a deploy nobody's about to look at) via the same
    // env-var-gated pattern this file already uses for the emergency
    // kill-switch above.
    process.env.VITE_ANALYZE === "1" &&
      visualizer({
        filename: "dist/bundle-stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
  ],
  // A plain top-level `define` (not something nested under VitePWA's own
  // options) is enough to reach src/sw.ts's own separate build too:
  // vite-plugin-pwa's `injectManifest` strategy runs the service worker
  // through its own Rollup pass, but explicitly reuses several of the main
  // config's own resolved Vite plugins for it — confirmed by reading its
  // installed source (`defaultInjectManifestVitePlugins`, in
  // `vite-plugin-pwa/dist/chunk-*.js`) — and `"vite:define"`, Vite's own
  // built-in plugin that performs this exact substitution, is one of them.
  // No `injectManifest.vitePlugins` override needed for that reason.
  define: {
    __SW_BUILD_ID__: JSON.stringify(resolveBuildId()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
  },
  test: {
    environment: "jsdom",
    // Order matters: polyfills.ts has to fully run before setup.ts's own
    // imports (which pull in Zustand stores that call browser APIs jsdom
    // doesn't implement) even begin loading — see polyfills.ts for why.
    setupFiles: ["./src/test/polyfills.js", "./src/test/setup.js"],
    // Explicit imports (`import { describe, it, expect } from "vitest"`)
    // rather than ambient globals — this repo has no jest/vitest ESLint env
    // today, and turning on `globals: true` would need one just to avoid
    // `no-undef`. Matches the rest of this codebase's preference for
    // explicit over implicit (e.g. the i18n `en` bundle being a real static
    // import, not a magic global).
    globals: false,
    // e2e/ holds Playwright specs, not Vitest ones — same `*.spec.js`-style
    // naming, but a different test runner and (per playwright.config.js)
    // a different global `test`/`expect` altogether. Left uncovered by
    // Vitest's default excludes since it's a directory this app added, not
    // one of Vitest's own conventional ignore patterns.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  build: {
    // Confirmed empirically via a real Lighthouse run against the built
    // landing page (not assumed): Vite's default modulepreload generation
    // adds a `<link rel="modulepreload">` for `vendor-charts` (recharts +
    // d3, ~400KB) to the one shared HTML entry — even though nothing the
    // landing page (or App.tsx, or main.tsx) ever statically imports
    // reaches recharts; only the lazy-loaded dashboard pages that actually
    // render a chart do. Vite's manual-chunk preload logic doesn't do
    // per-route reachability analysis for a single-entry SPA — it treats
    // every manualChunks vendor bucket as "probably needed soon" and
    // preloads all of them unconditionally. That's the right call for
    // `vendor-react` (every route needs React) and `vendor-motion`
    // (App.tsx's own `<MotionConfig>` wraps every route, landing
    // included), but genuinely wrong for `vendor-charts`: prerender.ts's
    // `app-shell.html` is a raw copy of this same head, shared by every
    // `/app/*` route including the many that never render a chart
    // (Settings, Wallets, Loops, FlareGPT, Donate) — so excluding it here
    // affects both HTML entries the same way. Chart-heavy pages
    // (Dashboard, DefiProtocols, ...) don't actually lose anything: their
    // own `lazy()` chunk statically imports the chart components that
    // import recharts, so Rollup's own dynamic-import machinery still
    // fetches `vendor-charts` alongside that page's chunk the moment it's
    // navigated to — this only removes the *unconditional, upfront* fetch
    // for every other page that never needed it at all.
    modulePreload: {
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes("vendor-charts")),
    },
     rollupOptions: {
      input: 'index.html',
      output: {
        // Every route is already `lazy()`-loaded (see AppRoutes.jsx), and
        // wagmi/viem/WalletConnect already split themselves into their own
        // chunks via their own internal dynamic imports (confirmed in the
        // build output: core/w3m-modal/sendRawTransaction). What's left
        // sitting inside the single large main-entry chunk is React itself
        // plus two sizable, independent libraries used across many
        // (but not all) routes — splitting just those three out lets the
        // browser cache the framework and each library separately from
        // this app's own code, so a normal deploy (which only changes app
        // code) doesn't force users to re-download React or Recharts too.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
            return "vendor-react";
          }
          // Checked *before* the recharts/d3 bucket below, not after — both
          // packages are also genuine recharts dependencies (recharts pulls
          // `eventemitter3` via its own internal react-redux store; the
          // `use-sync-external-store` shim comes from that same chain), so
          // without this carve-out Rollup physically embeds them inside the
          // vendor-charts chunk. That's fine for a page that actually
          // renders a chart, but wagmi's `createConfig()` (web3Config.ts,
          // imported eagerly by main.tsx on every route) also needs
          // `eventemitter3` for its own connector event emitter, and every
          // zustand store in this app (useUIStore, useAuthStore, ...) needs
          // the sync-external-store shim — confirmed via a real production
          // build's network trace: both eagerly-needed exports were only
          // reachable via a cross-chunk import into vendor-charts, which
          // dragged the entire ~118KB-gzip chart library into every route's
          // initial load, landing page included, even though nothing
          // outside the actual chart pages ever touches recharts itself.
          // Routing them into vendor-react instead — already unconditionally
          // loaded everywhere per the comment above — keeps them shared
          // exactly once without vendor-charts coming along for the ride.
          if (id.includes("eventemitter3") || id.includes("use-sync-external-store")) {
            return "vendor-react";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
        },
      },
    },
    target: "es2020",
    sourcemap: true,
    // The two chunks that trip Vite's default 500kB warning are wagmi's
    // own core plus WalletConnect/Reown AppKit/Coinbase's connector code
    // (confirmed by inspecting the actual build output, not assumed) —
    // large, well-known dependencies for any dApp supporting more than one
    // wallet, not app code that grew unchecked. They're already about as
    // well-split as they can be: WalletConnect/Reown/Coinbase each split
    // themselves into their own on-demand chunks via their own internal
    // dynamic imports (core/w3m-modal/sendRawTransaction/basic in the real
    // output), and forcing wagmi/viem's own eagerly-imported core into a
    // dedicated manualChunks bucket was tried and reverted — Rollup then
    // has to load that whole bucket eagerly too (it's `modulepreload`'d
    // from index.html the moment anything in it is statically imported),
    // which pulled viem's own previously *lazy* sendRawTransaction code
    // into the eager path — a real regression, not a win. Raised just
    // enough to stop flagging these two specific, justified chunks; still
    // low enough to catch genuine future bloat elsewhere.
    chunkSizeWarningLimit: 650,
  },
});