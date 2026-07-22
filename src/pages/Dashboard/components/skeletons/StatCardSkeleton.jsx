// Mirrors StatCard.jsx's exact structure (icon+title row, value, fixed-height
// footer slot) so swapping in real content causes no layout shift.
export default function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-3.5 w-3.5 rounded-full" />
      </div>
      <div className="skeleton h-6 w-20 rounded mt-2.5" />
      <div className="mt-1 h-5 flex items-center">
        <div className="skeleton h-3 w-12 rounded" />
      </div>
    </div>
  );
}
