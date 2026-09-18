// Pure, React-free derivation from GET /api/v1/fire/overview/v2 — used
// only to build FireTrendChart's data. Every other field this endpoint
// returns (pools[], latest_epoch, attribution, degraded/...) is left
// untouched here on purpose: v1 (useFireOverview) still backs the stats
// row, pools table, and burned-progress bar exactly as before, so this
// file's only job is turning `daily_history` into chart-ready series.

// Per the FIRE v2 handoff's Rule 2: daily_history amounts are wei-strings,
// and decimals depend on `token` (FLR: 18, FXRP: 6) — getting this wrong
// doesn't crash anything, it just silently renders a number off by a
// factor of 10^12. `Number()` on a wei-scale string does lose low-order
// precision (values here are well past Number.MAX_SAFE_INTEGER), but that
// lost precision is many orders of magnitude below anything the chart or
// its tooltip ever displays (a handful of significant digits of FLR/FXRP),
// so it's acceptable for a display-only conversion — same tolerance this
// codebase already applies everywhere else numeric API fields get
// formatted directly rather than kept as exact bigints.
const TOKEN_DECIMALS = { FLR: 18, FXRP: 6 };

function toTokenAmount(weiString, token) {
  const decimals = TOKEN_DECIMALS[token] ?? 18;
  const value = Number(weiString);
  return Number.isFinite(value) ? value / 10 ** decimals : 0;
}

// `periodId` isn't documented as strictly numeric or strictly a date
// string — sorting by string comparison would put "10" before "9", so
// this compares numerically when both sides parse as numbers and falls
// back to a plain string compare (correct for ISO date strings, which
// sort lexically in date order) otherwise.
function comparePeriods(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a).localeCompare(String(b));
}

// Different streams can be denominated in different tokens (confirmed by
// the handoff doc's own field reference — FDC is FLR, FAsset fees are
// FXRP), so they're never combined into one series: charting raw FLR and
// FXRP magnitudes on one shared axis would visually compare two unrelated
// scales as if they were the same unit. Grouped by token instead — one
// series per token actually present, each summed across every stream that
// shares it and bucketed by day — so FireTrendChart can render one
// correctly-scaled small chart per token rather than a single misleading
// combined line.
export function computeDailyTrend(dailyHistory) {
  if (!dailyHistory?.length) return [];

  const byToken = new Map();
  for (const entry of dailyHistory) {
    const token = entry.token;
    const amount = toTokenAmount(entry.accrued, token);
    if (!byToken.has(token)) byToken.set(token, new Map());
    const byPeriod = byToken.get(token);
    byPeriod.set(entry.periodId, (byPeriod.get(entry.periodId) ?? 0) + amount);
  }

  return Array.from(byToken.entries()).map(([token, byPeriod]) => ({
    token,
    points: Array.from(byPeriod.entries())
      .map(([periodId, accrued]) => ({ periodId, accrued }))
      .sort((a, b) => comparePeriods(a.periodId, b.periodId)),
  }));
}
