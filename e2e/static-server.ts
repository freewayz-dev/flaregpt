import http from "http";
import fs from "fs";
import path from "path";

// Serves dist/ the way Vercel actually serves it in production — not
// `vite preview`, which doesn't know about vercel.json's rewrites at all.
// A direct navigation to /app/wallet 404s under plain `vite preview` even
// though it works in real production, which would make the E2E suite
// blind to exactly the routing behavior it exists to check.
//
// Reads vercel.json's own `rewrites` array at runtime rather than
// hardcoding a second copy of its rules, so this can't silently drift out
// of sync with the real config. Only supports the two rewrite shapes
// vercel.json actually uses today (an exact path, or a path ending in
// "/(.*)" as a prefix match) — this is deliberately not a general
// path-to-regexp implementation, just enough to faithfully replicate what
// this one config file actually contains.

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.E2E_PORT) || 4500;

interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

interface VercelConfig {
  rewrites?: VercelRewrite[];
  headers?: VercelHeaderRule[];
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as VercelConfig;

function toMatcher(source: string): (pathname: string) => boolean {
  if (source.endsWith("/(.*)")) {
    const prefix = source.slice(0, -"/(.*)".length);
    return (pathname) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return (pathname) => pathname === source;
}

const rewrites = (vercelConfig.rewrites ?? []).map((r) => ({
  matches: toMatcher(r.source),
  destination: r.destination,
}));

// Same "read vercel.json at runtime, don't hand-maintain a second copy"
// reasoning as `rewrites` above — this is what actually lets e2e tests
// (and local manual verification) catch a real CSP/header regression
// before it reaches production, rather than only ever being checked by
// eye against the config file.
const headerRules = (vercelConfig.headers ?? []).map((h) => ({
  matches: toMatcher(h.source),
  headers: h.headers,
}));

function applyHeaders(res: http.ServerResponse, pathname: string): void {
  for (const rule of headerRules) {
    if (!rule.matches(pathname)) continue;
    for (const { key, value } of rule.headers) res.setHeader(key, value);
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function send(res: http.ServerResponse, filePath: string, pathname: string): void {
  const ext = path.extname(filePath);
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  applyHeaders(res, pathname);
  res.writeHead(200);
  fs.createReadStream(filePath).pipe(res);
}

function resolveStaticFile(pathname: string): string | null {
  const direct = path.join(DIST, pathname);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  const asIndex = path.join(DIST, pathname, "index.html");
  if (fs.existsSync(asIndex)) return asIndex;

  return null;
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  const staticFile = resolveStaticFile(pathname === "/" ? "/index.html" : pathname);
  if (staticFile) return send(res, staticFile, pathname);

  const rewrite = rewrites.find((r) => r.matches(pathname));
  if (rewrite) {
    const destFile = resolveStaticFile(rewrite.destination);
    if (destFile) return send(res, destFile, pathname);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`E2E static server (Vercel-faithful) listening on http://localhost:${PORT}`);
});
