import StatCardSkeleton from "@/pages/Dashboard/components/skeletons/StatCardSkeleton";

function CardSkeleton() {
  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="mt-4 space-y-3">
        <div className="skeleton h-2 w-full rounded-full" />
        <div className="skeleton h-2 w-2/3 rounded-full" />
      </div>
      <div className="skeleton h-16 rounded-xl mt-5" />
    </div>
  );
}

// Mirrors the real page's structure (KPI row, then a 2-col grid of Reward
// Velocity + Delegations, then the epochs card) so there's no layout shift
// once the query resolves — same convention as RflrVestingSkeleton.
export default function FtsoRewardsSkeleton() {
  return (
    <div role="status" className="space-y-5 sm:space-y-6">
      <div className="flex gap-3 overflow-x-hidden -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <CardSkeleton />
    </div>
  );
}
