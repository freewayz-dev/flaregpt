export default function WalletBalancesCardSkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-4 w-28 rounded mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-surface-inset p-3">
            <div className="skeleton h-2.5 w-8 rounded" />
            <div className="skeleton h-5 w-16 rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
