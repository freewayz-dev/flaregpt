import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import puppeteer from "puppeteer";

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;

const DIST = path.resolve(__dirname, "dist");
const PORT = 4319; // arbitrary, fixed so we can predictably poll it
const ORIGIN = `http://localhost:${PORT}`;

// The two public, indexable routes (see robots.txt/sitemap.xml) — nothing
// under /app is prerendered, that stays exactly the gated CSR dashboard it
// already is.
const ROUTES = [
  { path: "/", outFile: "index.html", waitFor: "h1" },
  { path: "/terms", outFile: path.join("terms", "index.html"), waitFor: "h1" },
];

function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server at ${url} didn't respond within ${timeoutMs}ms`));
        return;
      }
      setTimeout(attempt, 200);
    };
    attempt();
  });
}

async function main(): Promise<void> {
  // Preserve the pristine, empty-#root SPA shell *before* anything below
  // overwrites dist/index.html with the landing page's actual rendered
  // content — this is what vercel.json now rewrites every /app/* request
  // to, so a direct load/refresh of a dashboard route still gets a blank
  // shell for React Router to take over in, not a flash of landing-page
  // markup.
  const pristineShell = await fs.readFile(path.join(DIST, "index.html"), "utf8");
  await fs.writeFile(path.join(DIST, "app-shell.html"), pristineShell);

  const previewServer = spawn(
    "npx",
    ["vite", "preview", "--port", String(PORT), "--strictPort"],
    { cwd: __dirname, stdio: "pipe" },
  );
  let previewOutput = "";
  previewServer.stdout?.on("data", (d: Buffer) => (previewOutput += d));
  previewServer.stderr?.on("data", (d: Buffer) => (previewOutput += d));

  const browser = await puppeteer.launch({ headless: true });

  try {
    await waitForServer(ORIGIN);

    const page = await browser.newPage();

    // "/" is a real HTTP navigation — the very first request an actual
    // crawler or visitor makes.
    await page.goto(ORIGIN + "/", { waitUntil: "networkidle0", timeout: 20000 });
    await page.waitForSelector(ROUTES[0].waitFor, { timeout: 10000 });
    const homeHtml = await page.evaluate(() => document.documentElement.outerHTML);
    await fs.writeFile(path.join(DIST, ROUTES[0].outFile), "<!doctype html>\n" + homeHtml);
    console.log(`Prerendered / -> dist/${ROUTES[0].outFile}`);

    // "/terms" is reached via client-side navigation from the already-
    // loaded page (the same pushState + popstate mechanism React Router's
    // own <Link> triggers) rather than a second fresh page.goto — this
    // doesn't depend on whether the local preview server's own SPA
    // fallback exactly matches Vercel's rewrite behavior, since we never
    // ask the local server for /terms directly.
    await page.evaluate(() => {
      window.history.pushState({}, "", "/terms");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForFunction(
      () => document.querySelector("h1")?.textContent?.toLowerCase().includes("terms"),
      { timeout: 10000 },
    );
    const termsHtml = await page.evaluate(() => document.documentElement.outerHTML);
    const termsOutPath = path.join(DIST, ROUTES[1].outFile);
    await fs.mkdir(path.dirname(termsOutPath), { recursive: true });
    await fs.writeFile(termsOutPath, "<!doctype html>\n" + termsHtml);
    console.log(`Prerendered /terms -> dist/${ROUTES[1].outFile}`);

    await page.close();
  } finally {
    await browser.close();
    previewServer.kill();
  }
}

main().catch((err: unknown) => {
  console.error("Prerendering failed:", err);
  process.exit(1);
});
