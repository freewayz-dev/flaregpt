import TableCardSkeleton from "@/pages/Dashboard/components/skeletons/TableCardSkeleton";

// Mirrors ClaimsAndDelegationsSection's responsive split: a single tabbed
// card below `lg`, two side-by-side cards at `lg` and up.
export default function ClaimsAndDelegationsSkeleton() {
  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 rounded-xl bg-surface-inset py-2.5 flex justify-center">
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="hidden lg:grid gap-5 lg:grid-cols-2">
        <TableCardSkeleton />
        <TableCardSkeleton />
      </div>
    </>
  );
}
