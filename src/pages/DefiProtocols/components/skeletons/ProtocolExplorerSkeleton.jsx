function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3.5 py-3">
      <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="skeleton h-3.5 w-24 rounded" />
        <div className="skeleton h-2.5 w-32 rounded mt-1.5" />
      </div>
    </div>
  );
}

export default function ProtocolExplorerSkeleton() {
  return (
    <div role="status" className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none overflow-hidden">
      <div className="p-5 sm:p-6 sm:pb-0">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-3 w-56 rounded mt-2" />
      </div>

      <div className="hidden lg:flex lg:mt-5">
        <div className="w-[260px] shrink-0 space-y-1 border-r border-divider p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded mt-1.5" />
            </div>
          </div>
          <div className="skeleton h-8 w-40 rounded" />
          <div className="skeleton h-3 w-32 rounded mt-2" />
        </div>
      </div>

      <div className="mt-3 space-y-1 px-3 pb-3 lg:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
