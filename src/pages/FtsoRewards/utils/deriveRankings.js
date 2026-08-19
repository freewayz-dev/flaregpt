// Shared by ProviderRankingCard/ValidatorRankingCard — pure data shaping,
// kept separate from rendering the same way deriveFtsoRewards.js already
// is for the rest of this page.

// NodeIDs have no name resolution (confirmed via the backend's own OpenAPI
// description and live data — every validator-rankings entry's only
// identifier is `node_id`, unlike providers' real `name` field), so
// `shortenAddress` (built for 0x addresses) isn't the right fit here: it
// would eat into the "NodeID-" prefix instead of the actual identifier.
// This keeps the prefix intact and only truncates the base58 id after it.
export function shortenNodeId(nodeId) {
  if (!nodeId) return "";
  const prefix = "NodeID-";
  const id = nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
  if (id.length <= 12) return nodeId;
  return `${prefix}${id.slice(0, 6)}…${id.slice(-4)}`;
}

// `weight_share_pct`/`fee_pct` are already plain numbers (confirmed live,
// e.g. 3.632, 20.0) — formatted here, not trusted to already be display-
// ready strings.
export function computeProviderRows(data) {
  return (data?.providers ?? []).map((p) => ({
    key: p.address,
    address: p.address,
    name: p.name,
    weightSharePct: p.weight_share_pct,
    feePct: p.fee_pct,
  }));
}

export function computeValidatorRows(data) {
  return (data?.validators ?? []).map((v) => ({
    key: v.node_id,
    nodeId: v.node_id,
    connected: v.connected,
    uptimePct: v.uptime_pct,
    stakeFlr: v.stake_flr,
    delegatorCount: v.delegator_count,
    feePct: v.fee_pct,
  }));
}
