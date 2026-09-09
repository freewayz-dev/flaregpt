// Shared by ProviderRankingCard/ValidatorRankingCard — pure data shaping,
// kept separate from rendering the same way deriveFtsoRewards.js already
// is for the rest of this page.

// `shortenAddress` (built for 0x addresses) isn't the right fit for a
// NodeID: it would eat into the "NodeID-" prefix instead of the actual
// identifier. This keeps the prefix intact and only truncates the base58
// id after it. Used as ValidatorRow's secondary line when a validator has
// a real `name` (see computeValidatorRows below), and as its *primary*
// line when it doesn't — the NodeID is always real, distinct identifying
// information, never just a stand-in.
export function shortenNodeId(nodeId) {
  if (!nodeId) return "";
  const prefix = "NodeID-";
  const id = nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
  if (id.length <= 12) return nodeId;
  return `${prefix}${id.slice(0, 6)}…${id.slice(-4)}`;
}

// RankingAvatar's fallback initial for a validator with no registered
// `name` — the first character *after* the "NodeID-" prefix, not the
// literal first character of the raw string. Every NodeID starts with
// that same 7-character prefix, so `nodeId.charAt(0)` would show "N" for
// every unnamed validator alike — not meaningfully distinguishing one
// from another, exactly the "unclear placeholder" this exists to avoid.
// The character right after the prefix is the start of the actual unique
// base58 identifier, so it varies validator to validator the same way a
// name's own first letter would.
export function nodeIdInitial(nodeId) {
  if (!nodeId) return undefined;
  const prefix = "NodeID-";
  const id = nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
  return id.charAt(0) || undefined;
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

// `name` confirmed live on GET /api/v1/network/validator-rankings, but
// only for validators that have actually registered one — the backend
// added name resolution at some point after this file's original comments
// (which claimed no such field existed at all) were written, but it was
// never universal: a direct check of the full live 20-entry response
// found 12 with a real string name and 8 with a literal `name: null`, not
// a missing/optional field. Mapped straight through either way (`null`
// included) — ValidatorRow/RankingAvatar are what actually decide how to
// render a null name, not this layer.
export function computeValidatorRows(data) {
  return (data?.validators ?? []).map((v) => ({
    key: v.node_id,
    nodeId: v.node_id,
    name: v.name,
    connected: v.connected,
    uptimePct: v.uptime_pct,
    stakeFlr: v.stake_flr,
    delegatorCount: v.delegator_count,
    feePct: v.fee_pct,
  }));
}
