export default function StatCard({ title, value, change, icon: Icon, live = false }) {
  const isNegative = typeof change === "string" && change.trim().startsWith("-");

  return (
    <div className="rounded-2xl bg-surface-card hover:bg-surface-card-hover p-4 shadow-sm border border-[#E5E7EB] dark:border-none shrink-0 transition-colors duration-150">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-secondary truncate">{title}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-ink-muted shrink-0" />}
      </div>

      <h3 className="mt-1.5 text-xl font-bold text-ink-primary truncate">
        {value}
      </h3>

      {/* Fixed-height footer slot so all stat cards are the same height
          whether or not they have a change/live indicator to show. */}
      <div className="mt-1 h-5 flex items-center">
        {change ? (
          <span
            className={`text-xs font-medium ${
              isNegative ? "text-red-500" : "text-emerald-500"
            }`}
          >
            {change}
          </span>
        ) : live ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        ) : null}
      </div>
    </div>
  );
}
