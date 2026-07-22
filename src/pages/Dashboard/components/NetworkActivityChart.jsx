import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

import { useGasPrice } from "@/hooks/queries/useDashboardQueries";
import { useLiveSeries } from "@/hooks/useLiveSeries";
import NetworkActivityChartSkeleton from "@/pages/Dashboard/components/skeletons/NetworkActivityChartSkeleton";

export default function NetworkActivityChart() {
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } =
    useGasPrice();
  // Builds a real rolling chart in-memory from each live poll of /gas-price
  // (refetched every 20s) — the endpoint itself only returns a snapshot.
  const series = useLiveSeries(data?.gas_gwei, dataUpdatedAt, 30);
  const hasData = data?.gas_gwei != null && data?.network_tps != null;

  // isError must be checked before the "still loading" gate below — an
  // errored request also has no data (hasData is false), so checking
  // `isLoading || !hasData` alone would keep this stuck on the skeleton
  // forever once /gas-price fails all retries, since !hasData stays true
  // even after isLoading/isError have both settled.
  if (isError) {
    return (
      <div className="h-full flex flex-col rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
        <h3 className="text-sm font-semibold text-ink-primary">Network Activity</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
          <p className="text-sm font-medium text-ink-primary">
            Couldn't load network data
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            This is usually a temporary network hiccup.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !hasData) {
    return <NetworkActivityChartSkeleton />;
  }

  return (
    <div className="h-full flex flex-col rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary">Network Activity</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-5">
        <div>
          <p className="text-2xl font-bold text-ink-primary">
            {data.gas_gwei.toFixed(0)}
            <span className="ml-1 text-sm font-medium text-ink-muted">Gwei</span>
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">Gas Price</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-ink-primary">
            {data.network_tps.toFixed(2)}
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">TPS</p>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-[7rem]">
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                formatter={(v) => [v == null ? "—" : `${v.toFixed(0)} Gwei`, "Gas"]}
                contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#E62058"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-ink-muted text-center px-4">
            Collecting live samples — chart fills in as new data arrives.
          </div>
        )}
      </div>
    </div>
  );
}
