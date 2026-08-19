// Confirmed live against a real staked wallet (see YourValidatorStakeCard's
// top comment for the address and how it was found — via the
// PChainStakeMirror contract's on-chain StakeConfirmed events, not a guess).
// The API returns one entry per underlying P-chain stake transaction
// (`source: "native"`, each with its own `end_time`) plus one aggregate
// entry per node (`source: "mirrored"`, `end_time: null`) representing the
// C-chain-mirrored total for that node — confirmed the mirrored amount
// equals the sum of that node's native tranches in every sample observed.
// `uptime_pct`/`connected`/`fee_pct` were null on every stake entry in every
// sample — this endpoint doesn't populate them, so they're cross-referenced
// against the already-fetched validator-rankings data by `node_id` instead
// of rendered as-is (see YourValidatorStakeCard).
export function computeStakeSummary(data) {
  const stakes = data?.stakes ?? [];
  const byNode = new Map();

  for (const stake of stakes) {
    if (!stake.node_id) continue;
    if (!byNode.has(stake.node_id)) {
      byNode.set(stake.node_id, { nodeId: stake.node_id, mirroredFlr: null, nativeFlr: 0, trancheCount: 0, nextUnlock: null });
    }
    const entry = byNode.get(stake.node_id);
    if (stake.source === "mirrored") {
      entry.mirroredFlr = (entry.mirroredFlr ?? 0) + (stake.amount_flr ?? 0);
    } else {
      entry.nativeFlr += stake.amount_flr ?? 0;
      entry.trancheCount += 1;
      if (stake.end_time) {
        const endTime = new Date(stake.end_time).getTime();
        if (entry.nextUnlock === null || endTime < entry.nextUnlock) entry.nextUnlock = endTime;
      }
    }
  }

  const nodes = [...byNode.values()]
    .map((entry) => ({
      nodeId: entry.nodeId,
      totalFlr: entry.mirroredFlr ?? entry.nativeFlr,
      trancheCount: entry.trancheCount,
      nextUnlock: entry.nextUnlock,
    }))
    .sort((a, b) => b.totalFlr - a.totalFlr);

  const totalFlr = nodes.reduce((sum, node) => sum + node.totalFlr, 0);

  return { totalFlr, nodes };
}
