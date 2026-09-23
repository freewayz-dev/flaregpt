// Pure, React-free derivation from the two FAssets endpoints. `trend_daily`
// (from GET /api/v1/fassets/overview) becomes FassetsTrendChart's two
// small-multiple series ("minted per day" / "redeemed per day"). Every
// other overview field (supply, agents, proof_of_reserve, flow_24h,
// attribution, ...) is read directly by the components that need it — this
// file only holds derivations that are more than a single field read.

// Already oldest-first in every real response seen so far, but sorted here
// defensively rather than trusted — a reordered response would otherwise
// draw a zig-zagging line instead of a clean trend. ISO date strings sort
// correctly with a plain string compare.
function compareDates(a, b) {
  return a.localeCompare(b);
}

// Two single-hue small multiples, matching FireTrendChart's own established
// pattern of one chart per facet rather than overlaying two series on one
// axis (see FassetsTrendChart's own comment for why). Both facets are
// already the same unit (FXRP) in human-readable form per the handoff doc's
// own example — no per-entry token/decimal handling is needed the way
// Fire's wei-string `daily_history` required.
export function computeFlowTrend(trendDaily) {
  if (!trendDaily?.length) return [];

  const sorted = [...trendDaily].sort((a, b) => compareDates(a.date, b.date));

  return [
    { facet: "minted", points: sorted.map((d) => ({ date: d.date, value: d.minted_fxrp })) },
    { facet: "redeemed", points: sorted.map((d) => ({ date: d.date, value: d.redeemed_fxrp })) },
  ];
}

// `redeeming_fxrp` (from GET /api/v1/fassets/agents) is a real, live,
// per-agent field with no system-wide counterpart on the overview endpoint
// — this sums it across every agent currently returned. A plain, honest
// aggregation of a real field across the complete, known agent set (never
// a sample or an estimate), not an invented metric — every agent the
// backend returns is included, so the total is exact for "right now"
// rather than approximate. Returns `null` (not 0) when `agents` isn't
// loaded yet, so callers can tell "still loading" apart from "genuinely
// zero pending redemptions".
export function computePendingRedemptions(agents) {
  if (!agents?.length) return agents ? 0 : null;
  return agents.reduce((sum, agent) => sum + (agent.redeeming_fxrp ?? 0), 0);
}
