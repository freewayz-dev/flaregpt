import fs from "fs/promises";
import path from "path";
import { createServer } from "vite";
import { builtinEnvironments } from "vitest/runtime";

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;

const DIST = path.resolve(__dirname, "dist");

// The two public, indexable routes (see robots.txt/sitemap.xml) — nothing
// under /app is prerendered, that stays exactly the gated CSR dashboard it
// already is. `check` is the readiness signal: both routes go through a
// React.lazy()+Suspense boundary (see AppRoutes.tsx), so the very first
// render commit is the GlobalSpinner fallback, not the real page — this is
// what each route's own render settles into once the lazy import resolves.
const ROUTES = [
  {
    path: "/",
    outFile: "index.html",
    check: (h1Text: string) => h1Text.trim().length > 0,
  },
  {
    path: "/terms",
    outFile: path.join("terms", "index.html"),
    check: (h1Text: string) => h1Text.toLowerCase().includes("terms"),
  },
];

function waitFor(predicate: () => boolean, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timed out after ${timeoutMs}ms waiting for content to render`));
      }
      setTimeout(attempt, 25);
    };
    attempt();
  });
}

async function main(): Promise<void> {
  // Preserve the pristine, empty-#root SPA shell *before* anything below
  // overwrites dist/index.html with the landing page's actual rendered
  // content — this is what vercel.json rewrites every /app/* request to,
  // so a direct load/refresh of a dashboard route still gets a blank shell
  // for React Router to take over in, not a flash of landing-page markup.
  const pristineShell = await fs.readFile(path.join(DIST, "index.html"), "utf8");
  await fs.writeFile(path.join(DIST, "app-shell.html"), pristineShell);
  const headMatch = pristineShell.match(/<head>([\s\S]*?)<\/head>/);
  const bodyMatch = pristineShell.match(/<body>([\s\S]*?)<\/body>/);
  if (!headMatch || !bodyMatch) {
    throw new Error("prerender: couldn't find <head>...</head> or <body>...</body> in dist/index.html");
  }
  const realHeadContent = headMatch[1];
  // Includes the empty `<div id="root">` React renders into below, but
  // also the `<noscript>` fallback and the inline theme-detection
  // `<script>` that sit *after* it — both need to survive into the final
  // output exactly like they do for a real browser, not just the root div.
  const realBodyContent = bodyMatch[1];

  // Vite's own config/plugin loading (below) spins up esbuild's native
  // service and needs an ordinary, unmodified Node global environment —
  // confirmed live: doing the jsdom environment setup *before* this
  // `createServer` call corrupted esbuild's own Node<->native-binary IPC
  // (a low-level Go-side panic loading vite.config.ts, not anything about
  // this app's own code). So Vite gets built first, against a clean
  // process, and jsdom's globals only get installed afterward — right
  // before anything that actually needs them runs.
  const vite = await createServer({
    root: __dirname,
    appType: "custom",
    server: { middlewareMode: true },
    logLevel: "warn",
  });

  try {
    // Seeded with a script-free, headless shell — not the real
    // pristineShell directly. The real <head> (title/canonical/OG/JSON-LD/
    // favicon links) and the `<script type="module">` tag both need to
    // end up in the final output, but jsdom executes any `<script>` present
    // in the HTML it's *constructed* with as soon as it's parsed — before
    // this function gets control back, and before the polyfills below have
    // even run (confirmed live: the seed HTML's own inline dark-mode
    // script threw on `window.matchMedia` immediately during setup).
    // Injecting the real head via `.innerHTML` *after* setup sidesteps
    // this entirely: script tags assigned through `innerHTML` become real
    // DOM nodes (so they're still present, inert, in the final serialized
    // output for real hydration later) but the DOM spec never executes
    // scripts inserted that way, only ones present in the document at
    // parse time.
    const { teardown } = await builtinEnvironments.jsdom.setup(globalThis, {
      jsdom: {
        html: '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
        url: "https://www.flaregpt.io/",
      },
    });

    try {
      document.head.innerHTML = realHeadContent;
      document.body.innerHTML = realBodyContent;

      // Same polyfills the Vitest suite already relies on
      // (window.matchMedia, ResizeObserver,
      // getBoundingClientRect/offsetWidth/offsetHeight) — reused as-is,
      // not reimplemented, and must run before any app module that
      // touches those APIs at import time (see that file's own comment
      // for exactly which store does this and why) gets imported below.
      await import("./src/test/polyfills.ts");

      const { renderRoute } = await vite.ssrLoadModule("/src/prerenderEntry.tsx");

      for (const route of ROUTES) {
        const root = await renderRoute(route.path);

        await waitFor(() => {
          const h1 = document.getElementById("root")?.querySelector("h1");
          return Boolean(h1 && route.check(h1.textContent ?? ""));
        });

        const html = "<!doctype html>\n" + document.documentElement.outerHTML;
        const outPath = path.join(DIST, route.outFile);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, html);
        console.log(`Prerendered ${route.path} -> dist/${route.outFile}`);

        root.unmount();
      }

      // React's scheduler defers some of its own internal work (observed:
      // a `performWorkUntilDeadline` tick from the scheduler package) via
      // `setImmediate`, which can still be pending after `unmount()`
      // returns — confirmed live: without this, that callback fired
      // *after* `teardown()` below had already deleted `window` from the
      // global scope, crashing the whole process with "window is not
      // defined" right after the real work (both files) had already been
      // written successfully. One tick is enough to drain it.
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      await teardown(globalThis);
    }
  } finally {
    await vite.close();
  }
}

main()
  .then(() => {
    // A one-shot build script, not a long-running process — explicit exit
    // rather than waiting for the event loop to drain on its own.
    // Confirmed live: something in this dependency tree (jsdom's own
    // `pretendToBeVisual` timers are the leading suspect, not confirmed
    // further since it doesn't matter — the actual work is already done
    // and written by this point regardless) leaves a handle open that
    // otherwise stalls Node's natural exit for a long time after every
    // real file has already been written successfully.
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("Prerendering failed:", err);
    process.exit(1);
  });
