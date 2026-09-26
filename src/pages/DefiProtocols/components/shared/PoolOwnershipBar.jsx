// A horizontal fill bar rather than a radial/donut chart — deliberately: at
// the very small percentages a fresh position typically has, a donut slice
// reads as "basically nothing" either way, while a labeled bar keeps the
// exact value legible and stays visually calm at 0% instead of looking
// like an empty/broken ring.


export default function PoolOwnershipBar({ label, percentage, valueLabel }) {
  const clamped = Math.min(100, Math.max(0, percentage || 0));
  // A genuine but tiny non-zero value (FAssets' own Daily Minting Limit bar
  // surfaced this live: ~0.29% used) rendered as a sub-3px sliver,
  // indistinguishable from a true 0% or an unloaded bar — confirmed via a
  // UX review. Floored at 1.5% only when there's really something to show,
  // shared here rather than patched per caller since every other user of
  // this bar (vote splits, APR meters, vesting/delegation shares) has the
  // exact same "a real value shouldn't look empty" problem at its own
  // extremes. `aria-valuenow`/`valueLabel` below still report the real,
  // unfloored number — only the rendered pixel width is floored, so
  // assistive tech and the visible text label stay numerically accurate.
  const renderWidth = clamped > 0 ? Math.max(clamped, 1.5) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="text-xs font-semibold text-ink-primary">
          {valueLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        aria-valuetext={valueLabel}
        className="h-1.5 w-full rounded-full bg-surface-inset overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${renderWidth}%` }}
        />
      </div>
    </div>
  );
}
