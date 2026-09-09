// Hook-free static shimmer — safe to reuse both as the route-level
// Suspense fallback (FirePageSkeleton, before the page chunk itself has
// loaded) and as index.jsx's own in-page loading state while
// useFireOverview() is in flight, same split as Links'
// LinksGridSkeleton/LinksPageSkeleton.
export default function FireSkeleton() {
  return (
    <div role="status" className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-24 rounded-2xl"
          />
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
