// Mirrors FlrPriceChart.jsx's structure: title, price+change, range toggle,
// chart area — used both by DashboardSkeleton and FlrPriceChart's own
// isLoading branch so the two never visually disagree.
export default function FlrPriceChartSkeleton() {
  return (
    <div role="status" className="h-full min-w-0 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="skeleton h-3.5 w-16 rounded" />
          <div className="skeleton h-7 w-28 rounded mt-2" />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1 self-start shrink-0">
          {["1D", "7D", "30D", "1Y"].map((label) => (
            <div key={label} className="px-2.5 py-1">
              <div className="skeleton h-3 w-6 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="skeleton h-56 sm:h-64 rounded-xl mt-4 min-w-0" />
    </div>
  );
}
