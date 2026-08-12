// Pure, React-free derivations from the two per-wallet rFLR endpoints —
// mirrors WalletActivity/utils/deriveActivity.js's split (raw API shape in,
// plain view-model out), so every card downstream renders pre-computed
// props instead of re-deriving the same numbers from raw response fields.










// A type alias intersected with `Record<string, unknown>` (not a plain
// `interface`), matching FtsoPortfolioResponse's `unclaimed_epochs_ledger`
// precedent — GenericTable's `items` prop needs a real string index
// signature to derive columns via `Object.keys`, which a named `interface`
// doesn't structurally provide even when every property is known.


// A wallet that never earned any rFLR gets a completely different response
// shape from the backend — confirmed live: `{"status":"No Balance",
// "net_payout_if_exiting":0}`, with none of the usual balance/locked/
// efficiency fields at all, rather than the normal shape with everything
// zeroed out. Treated as its own case (`hasNoRflr`) rather than letting it
// fall through to the normal fields defaulting to 0 — that path used to
// render a "100% Vested" progress bar and a "fully vested, nothing left to
// unlock" message for a wallet that never had any rFLR to begin with, which
// is a materially different (and misleading) story from actually having
// vested and withdrawn a real balance.
export function computeVestingSummary(exitQuote) {
  const hasNoRflr = exitQuote.status === "No Balance" || exitQuote.total_balance == null;

  const total = exitQuote.total_balance ?? 0;
  const liquid = exitQuote.liquid_now ?? 0;
  const locked = exitQuote.locked_vesting ?? 0;
  // Guards the 0/0 case so it reads as fully vested rather than a NaN
  // progress bar for the (distinct, still-possible) case of a wallet that
  // did have a balance but has since fully liquidated it.
  const vestedPercent = total > 0 ? (liquid / total) * 100 : 100;

  return {
    hasNoRflr,
    total,
    liquid,
    locked,
    vestedPercent,
    netPayout: exitQuote.net_payout_if_exiting ?? 0,
    penalty: exitQuote.exit_penalty_cost ?? 0,
    // Already a formatted string from the API (e.g. "82.43%") — kept as-is
    // for display, parsed separately wherever a number is needed for tone.
    efficiencyLabel: exitQuote.efficiency_ratio ?? null,
    isFullyVested: locked <= 0,
  };
}

// Multiple reward batches (month_id cohorts) can each have an installment
// unlocking on the same calendar date — aggregated here into one point per
// date so the chart plots real unlock events, not one line per cohort.
export function computeUnlockTimeline(
  meltSchedule,
) {
  const entries = meltSchedule?.data ?? [];
  if (!entries.length) {
    return { points: [], nextUnlock: null };
  }

  const byDate = new Map();
  for (const entry of entries) {
    const key = entry.unlock_date;
    byDate.set(key, (byDate.get(key) ?? 0) + (entry.amount_flr ?? 0));
  }

  const points = Array.from(byDate.entries())
    .map(([date, amount]) => ({ date, timestamp: new Date(date).getTime(), amount, cumulative: 0 }))
    .sort((a, b) => a.timestamp - b.timestamp);

  let cumulative = 0;
  for (const point of points) {
    cumulative += point.amount;
    point.cumulative = cumulative;
  }

  const now = Date.now();
  const nextUnlock = points.find((p) => p.timestamp >= now) ?? null;

  return { points, nextUnlock };
}

// Flat, chronological rows for the raw-detail table behind the timeline
// chart's disclosure — `status` is translated here (not left as the raw
// boolean) since GenericTable has no per-column formatting hook of its own.
export function buildMeltScheduleRows(
  meltSchedule,
  t,
) {
  const entries = meltSchedule?.data ?? [];
  return [...entries]
    .sort((a, b) => new Date(a.unlock_date).getTime() - new Date(b.unlock_date).getTime())
    .map((entry) => ({
      unlock_date: entry.unlock_date,
      source: entry.source,
      amount_flr: entry.amount_flr,
      status: entry.is_liquid
        ? t("rflrVesting.timeline.statusLiquid")
        : t("rflrVesting.timeline.statusLocked"),
    }));
}
