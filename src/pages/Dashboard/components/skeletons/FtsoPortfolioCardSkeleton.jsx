export default function FtsoPortfolioCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-3 w-14 rounded" />
      </div>

      <div className="divide-y divide-divider">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3.5 w-14 rounded" />
          </div>
        ))}
      </div>

      <div className="skeleton h-10 w-full rounded-xl mt-4" />
    </div>
  );
}
