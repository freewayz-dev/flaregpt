// Hook-free, static shimmer grid — safe to reuse both as the route-level
// Suspense fallback (LinksPageSkeleton, before the page chunk itself has
// loaded) and as Links/index.jsx's own in-page loading state while
// useLinks() is in flight, same reasoning as FtsoRewards'
// RankingTablesSectionSkeleton split.
function LinkCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-3">
      <div className="flex items-start gap-3">
        <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
        <div className="flex-1 flex items-start justify-between gap-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-4 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <div className="skeleton h-6 w-20 rounded-lg" />
        <div className="skeleton h-6 w-14 rounded-lg" />
        <div className="skeleton h-6 w-7 rounded-lg" />
        <div className="skeleton h-6 w-14 rounded-lg" />
      </div>
    </div>
  );
}

export default function LinksGridSkeleton() {
  return (
    <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <LinkCardSkeleton key={i} />
      ))}
    </div>
  );
}
