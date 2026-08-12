// Pure, React-free derivations from GET /api/v1/portfolio/ftso/{wallet} —
// same split as rFLR's deriveVesting.js (raw API shape in, plain view-model
// out). Confirmed live against several real wallets (not just the sample
// response), which is what these functions are actually built to handle:
//   - a wallet that's never delegated at all: calculation_method
//     "INACTIVE", every numeric field 0, both arrays empty.
//   - a wallet with one delegation and an empty unclaimed_epochs_ledger:
//     calculation_method "HISTORICAL_BLOCK_FALLBACK_VELOCITY" — the
//     backend falls back to a historical-block estimate when there's no
//     live unclaimed-epoch data yet to derive a velocity from.
//   - a wallet with multiple delegations and a real ledger:
//     calculation_method "LIVE_UNCLAIMED_LEDGER_VELOCITY", several ledger
//     rows per epoch (one per delegation) — confirmed the API's own
//     `cumulative_unclaimed_flr` is exactly the sum of every ledger row's
//     `unclaimed_amount_flr`, so that field is trusted directly rather
//     than re-derived.
// `calculation_method` is treated as an open set, not a fixed enum — any
// value this hasn't seen gets a humanized fallback label rather than
// rendering blank or crashing.









export function computeRewardsSummary(portfolio) {
  // `?? {}` fallbacks removed here — dead defensive code (same pattern
  // Phase 1 found and removed in apiClient.ts): `FtsoPortfolioResponse`
  // declares both fields required, matching every real wallet response
  // this function is confirmed to handle (see the file-level comment
  // above), so there's no real case where either is actually absent.
  const infra = portfolio.ftso_infrastructure;
  const estimation = portfolio.realtime_estimation;

  const wflrBalance = infra.user_wflr_balance ?? 0;
  const unclaimed = infra.cumulative_unclaimed_flr ?? 0;
  const hourlyEarning = estimation.estimated_hourly_earning ?? 0;

  return {
    wflrBalance,
    unclaimed,
    hourlyEarning,
    dailyEarning: hourlyEarning * 24,
    targetEpochYield: estimation.epoch_completion_target_yield ?? 0,
    accrualRatePerSecond: estimation.accrual_rate_per_second ?? 0,
    calculationMethod: estimation.calculation_method ?? null,
    velocitySourceEpoch: estimation.velocity_source_epoch ?? null,
    isInactive: (estimation.calculation_method ?? "INACTIVE") === "INACTIVE",
    delegationCount: portfolio.active_delegations?.length ?? 0,
  };
}

export function computeDelegationRows(portfolio) {
  const delegations = portfolio.active_delegations ?? [];
  // Sorted by weight so the largest allocation reads first — the API
  // doesn't guarantee an order (confirmed live: a 2-delegation wallet
  // returned them 27%/73%, already descending, but nothing about the
  // shape promises that generally).
  return [...delegations]
    .map((d) => ({
      address: d.provider_address,
      name: d.provider_name || null,
      bips: d.allocated_bips ?? 0,
      weightLabel: d.weight_percentage ?? `${((d.allocated_bips ?? 0) / 100).toFixed(1)}%`,
      weightPercent: (d.allocated_bips ?? 0) / 100,
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent);
}

// Multiple ledger rows can share the same epoch_id (confirmed live: a
// 2-delegation wallet had exactly two rows per epoch, presumably one per
// provider) — aggregated here into one point per epoch for the chart, the
// same way rFLR's melt-schedule entries get aggregated by date.
export function computeEpochLedgerChart(portfolio) {
  const entries = portfolio.unclaimed_epochs_ledger ?? [];
  if (!entries.length) return { points: [] };

  const byEpoch = new Map();
  for (const entry of entries) {
    const key = entry.epoch_id;
    byEpoch.set(key, (byEpoch.get(key) ?? 0) + (entry.unclaimed_amount_flr ?? 0));
  }

  const points = Array.from(byEpoch.entries())
    .map(([epochId, amount]) => ({ epochId, amount }))
    .sort((a, b) => a.epochId - b.epochId);

  return { points };
}

// Flat rows for the raw-detail table behind the ledger chart's disclosure,
// newest epoch first (matches how someone would actually scan "what's
// still unclaimed" — most recent first, not oldest).
export function buildEpochLedgerRows(
  portfolio,
) {
  const entries = portfolio.unclaimed_epochs_ledger ?? [];
  return [...entries]
    .sort((a, b) => b.epoch_id - a.epoch_id)
    .map((entry) => ({
      epoch: entry.epoch_id,
      unclaimed_flr: entry.unclaimed_amount_flr,
    }));
}
