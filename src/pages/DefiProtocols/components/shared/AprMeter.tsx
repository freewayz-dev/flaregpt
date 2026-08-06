// Compact inline visual for the strategy comparison table — replaces a
// separate bar chart that would otherwise just re-plot the same 3 numbers
// already in the table. Width is relative to the highest APR in the set, so
// the bars alone communicate ranking at a glance.
interface AprMeterProps {
  value: number;
  max: number;
}

export default function AprMeter({ value, max }: AprMeterProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Deliberately `aria-hidden`, not `role="progressbar"` — unlike
  // PoolOwnershipBar's fill (an absolute 0-100% of a real quantity), this
  // bar's width is *relative to whichever strategy currently has the
  // highest APR in the set* — a number with no independent meaning to
  // announce on its own. The real, absolute APR value is already the
  // visible text sitting directly next to this in every caller
  // (StrategyComparisonTable), so nothing is lost by treating this
  // specific visual as purely decorative.
  return (
    <div
      aria-hidden="true"
      className="h-1.5 w-14 shrink-0 rounded-full bg-surface-inset overflow-hidden"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
