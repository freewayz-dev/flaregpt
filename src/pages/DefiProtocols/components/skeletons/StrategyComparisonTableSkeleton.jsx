function MobileCardSkeleton() {
  return (
    <div className="rounded-xl bg-surface-inset p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-36 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-14 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  );
}

// Header no longer reserves an icon chip — the real Strategy Comparison
// title has never had one since the icon was dropped from that section, so
// the skeleton shouldn't imply one either. Mirrors both real layouts: the
// stacked mobile cards and the sm+ table rows.
export default function StrategyComparisonTableSkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-52 rounded mt-2" />
        </div>
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>

      <div className="mt-6 space-y-3 sm:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <MobileCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-6 hidden space-y-4 sm:block">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-1">
            <div className="skeleton h-3.5 w-40 rounded" />
            <div className="skeleton h-3.5 w-16 rounded" />
            <div className="skeleton h-3.5 w-14 rounded" />
            <div className="skeleton h-3.5 w-28 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
