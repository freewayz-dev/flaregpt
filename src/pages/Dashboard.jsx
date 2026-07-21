import StatCard from "@/components/cards/StatCard";
import {
  useMarketStats,
  useRecentActivity,
  useHoldings,
} from "@/hooks/queries/useDashboardQueries";

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a1a] animate-pulse">
      <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-8 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function Dashboard() {
  const {
    data: marketStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useMarketStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();

  return (
    <div className="space-y-6 pb-14">
      {/* STAT GRID */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading &&
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}

        {statsError && (
          <div className="col-span-full rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a1a] text-sm text-red-500">
            Couldn't load market stats. Please try again later.
          </div>
        )}

        {marketStats?.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* CHART */}
        <div className="col-span-2 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#101010]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              FLR Price Chart
            </h3>

            <span className="text-xs text-brand px-2 py-1 rounded-full bg-brand/10 border border-brand/20">
              Live
            </span>
          </div>

          <div className="flex h-96 items-center justify-center rounded-xl bg-slate-50 dark:bg-black text-slate-400">
            Chart Placeholder
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#101010]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Recent Activity
          </h3>

          <div className="space-y-3 text-sm">
            {activityLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                />
              ))}

            {activity?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOLDINGS */}
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#1a1a1a]">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          My Holdings
        </h3>

        <div className="grid gap-4 md:grid-cols-4 text-sm">
          {holdingsLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-[#1a1a1a] dark:border-[#27272a] p-3 animate-pulse"
              >
                <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-5 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-1 mt-2 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}

          {holdings?.map((item) => (
            <div
              key={item.symbol}
              className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-[#1a1a1a] dark:border-[#27272a] p-3"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {item.symbol}
              </div>

              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {item.allocationPct}%
              </div>

              <div className="h-1 mt-2 rounded-full bg-brand/20">
                <div
                  className="h-1 rounded-full bg-brand"
                  style={{ width: `${item.allocationPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
