// Generic table-shaped skeleton (header row + a few data rows/cells) used by
// both the Claims History and Delegations Breakdown cards, since neither has
// a confirmed real row shape yet — this approximates "a table is coming"
// without pretending to know the exact columns.
interface TableCardSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function TableCardSkeleton({ rows = 3, cols = 3 }: TableCardSkeletonProps) {
  return (
    <div role="status" className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-4 w-32 rounded mb-4" />

      <div className="flex gap-4 pb-2 border-b border-divider">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-2.5 w-12 rounded" />
        ))}
      </div>
      <div className="divide-y divide-divider">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton h-3 w-14 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
