// A horizontal fill bar rather than a radial/donut chart — deliberately: at
// the very small percentages a fresh position typically has, a donut slice
// reads as "basically nothing" either way, while a labeled bar keeps the
// exact value legible and stays visually calm at 0% instead of looking
// like an empty/broken ring.
interface PoolOwnershipBarProps {
  label: string;
  percentage: number;
  valueLabel: string;
}

export default function PoolOwnershipBar({ label, percentage, valueLabel }: PoolOwnershipBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage || 0));

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
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
