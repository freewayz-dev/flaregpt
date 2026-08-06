// Imported from "vitest/config" rather than plain "vite" — a type-safe
// superset that adds the `test` key below; functionally the same
// `defineConfig` either way, but this is Vitest's own recommended import
// so tooling understands the `test` field.
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "node:path";

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;

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
  ],
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
    setupFiles: ["./src/test/polyfills.ts", "./src/test/setup.ts"],
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
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
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