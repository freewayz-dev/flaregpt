// Mirrors GovernanceHistoryTable's real shape (card header + a handful of
// table-row-height bars) so the table doesn't visibly grow/shrink once
// real history resolves.
export default function GovernanceHistorySkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-4 w-40 rounded" />
      <div className="skeleton h-3 w-64 rounded mt-2" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
