import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";

// Hook-free static shimmer — safe to reuse both as the route-level Suspense
// fallback (FassetsPageSkeleton, before the page chunk itself has loaded)
// and as index.jsx's own in-page loading state while useFassetsOverview()
// is in flight, same split as Fire's FireSkeleton/FirePageSkeleton.
//
// Both the stat row and the 24h Flow block below used to be bare
// `.skeleton` divs with no card shell of their own — the shimmer color
// (`--color-surface-inset`, #F3F4F6 in light mode) sits almost directly on
// the page's own background (#F0F4F9), close enough in tone to read as
// essentially blank rather than "loading" (confirmed live). The stat row
// now reuses `StatCardSkeleton` (the same established placeholder
// StatRow.jsx/KpiSummaryRow.jsx already use) inside a container mirroring
// FassetsStatsRow.jsx's own always-scrollable shape (7 cards, no sm:grid
// fallback — that row is deliberately never a grid, see its own comment);
// the 24h Flow block gets a real white card shell with skeleton bars
// inside, matching every other card-shaped skeleton on this page instead
// of one undifferentiated colored rectangle.
export default function FassetsSkeleton() {
  return (
    <div role="status" className="space-y-5 sm:space-y-6">
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 md:-mx-6 md:px-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="min-w-[188px]">
            <StatCardSkeleton />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-4">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-16 rounded ml-auto" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
