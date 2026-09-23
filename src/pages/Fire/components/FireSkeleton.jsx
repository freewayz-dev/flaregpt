import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";

// Hook-free static shimmer — safe to reuse both as the route-level
// Suspense fallback (FirePageSkeleton, before the page chunk itself has
// loaded) and as index.jsx's own in-page loading state while
// useFireOverview() is in flight, same split as Links'
// LinksGridSkeleton/LinksPageSkeleton.
//
// The top row reuses `StatCardSkeleton` (already the established stat-card
// loading placeholder — see Dashboard's StatRow.jsx/DeFi's KpiSummaryRow.jsx)
// rather than a bare `.skeleton` block: a bare block has no card shell of
// its own, so its shimmer color (`--color-surface-inset`, #F3F4F6 in light
// mode) sat almost directly on the page's own background (#F0F4F9) — close
// enough in tone to read as essentially blank rather than "loading."
// `StatCardSkeleton` wraps the shimmer in the same real white card shell
// StatCard.jsx itself uses, which is what actually makes it visible,
// and mirrors FireStatsRow.jsx's own `sm:grid-cols-3` shape exactly so
// there's no layout shift once real data arrives.
export default function FireSkeleton() {
  return (
    <div role="status" className="space-y-5 sm:space-y-6">
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-12 rounded ml-auto" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
