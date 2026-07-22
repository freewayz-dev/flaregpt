export default function NetworkActivityChartSkeleton() {
  return (
    <div className="h-full flex flex-col rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton h-3 w-10 rounded" />
      </div>
      <div className="flex items-baseline gap-5 mt-3">
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-5 w-10 rounded" />
      </div>
      <div className="skeleton h-28 rounded-xl mt-4 flex-1" />
    </div>
  );
}
