// Compact inline visual for the strategy comparison table — replaces a
// separate bar chart that would otherwise just re-plot the same 3 numbers
// already in the table. Width is relative to the highest APR in the set, so
// the bars alone communicate ranking at a glance.
export default function AprMeter({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className="h-1.5 w-14 shrink-0 rounded-full bg-surface-inset overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
