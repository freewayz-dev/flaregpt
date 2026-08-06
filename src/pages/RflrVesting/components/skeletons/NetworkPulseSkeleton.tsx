export default function NetworkPulseSkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-3 w-48 rounded mt-2" />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
