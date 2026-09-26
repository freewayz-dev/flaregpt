// Phase 7's own "measure, don't assume" mandate applied to development
// itself, not a shipped analytics pipeline — this never runs in
// production (see the `import.meta.env.DEV` guard at the one call site,
// main.tsx) and never transmits or persists anything anywhere; it only
// ever writes to this browser's own console for whoever has devtools
// open. The dynamic `import()` (not a static one) is deliberate: even
// though `web-vitals` is a devDependency, a *static* import would still
// need Rollup to prove the package has no side effects before safely
// tree-shaking it out of a production bundle if this file were ever
// reached from a non-dev-gated path by mistake — a dynamic import behind
// `if (import.meta.env.DEV)` is unambiguous, so there's no chance of this
// costing production users a single byte.


const THRESHOLDS = {
  // [good, needs-improvement] upper bounds — web.dev's own published Core
  // Web Vitals thresholds, not this app's invention.
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export function rate(name, value) {
  const bounds = THRESHOLDS[name];
  if (!bounds) return "good";
  const [good, needsImprovement] = bounds;
  if (value <= good) return "good";
  if (value <= needsImprovement) return "needs-improvement";
  return "poor";
}

const COLORS = {
  good: "color: #10b981; font-weight: 600",
  "needs-improvement": "color: #f59e0b; font-weight: 600",
  poor: "color: #ef4444; font-weight: 600",
};

function logMetric(metric) {
  const verdict = rate(metric.name, metric.value);
  const displayValue = metric.name === "CLS" ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
  console.log(`%c[web-vitals] ${metric.name}: ${displayValue} (${verdict})`, COLORS[verdict]);
}

export async function logWebVitalsInDev() {
  const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import("web-vitals");
  onLCP(logMetric);
  onCLS(logMetric);
  onINP(logMetric);
  onFCP(logMetric);
  onTTFB(logMetric);
}
