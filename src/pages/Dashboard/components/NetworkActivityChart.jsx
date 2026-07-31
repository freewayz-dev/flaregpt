import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

import { useGasPrice } from "@/hooks/queries/useDashboardQueries";
import { useLiveSeries } from "@/hooks/useLiveSeries";
import NetworkActivityChartSkeleton from "@/pages/Dashboard/components/skeletons/NetworkActivityChartSkeleton";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";

export default function NetworkActivityChart() {
  const { t } = useTranslation();
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } =
    useGasPrice();
  // Builds a real rolling chart in-memory from each live poll of /gas-price
  // (refetched every 20s) — the endpoint itself only returns a snapshot.
  const series = useLiveSeries(data?.gas_gwei, dataUpdatedAt, 30);
  const hasData = data?.gas_gwei != null && data?.network_tps != null;

  // The gas price/TPS stat above only ever shows the current snapshot — a
  // screen reader user has no way to reach the rolling trend a sighted user
  // reads directly off the line chart below. Same Disclosure + GenericTable
  // pattern already used for UnlockTimelineCard/UnclaimedEpochsCard. `series`
  // itself is chronological (oldest first, same order the chart plots
  // left-to-right), reversed here to newest-first for the list.
  const tableRows = [...series].reverse().map((point) => ({
    Time: new Date(point.time).toLocaleTimeString(),
    Gwei: point.value == null ? "—" : point.value.toFixed(0),
  }));

  // isError must be checked before the "still loading" gate below — an
  // errored request also has no data (hasData is false), so checking
  // `isLoading || !hasData` alone would keep this stuck on the skeleton
  // forever once /gas-price fails all retries, since !hasData stays true
  // even after isLoading/isError have both settled.
  if (isError) {
    return (
      <div className="h-full flex flex-col rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
        <h3 className="text-sm font-semibold text-ink-primary">{t("dashboard.networkActivity.title")}</h3>
        <div role="alert" className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.networkActivity.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.common.networkHiccup")}
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
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
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
        <h3 className="text-sm font-semibold text-ink-primary">{t("dashboard.networkActivity.title")}</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t("dashboard.networkActivity.live")}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-5">
        <div>
          <p className="text-2xl font-bold text-ink-primary">
            {data.gas_gwei.toFixed(0)}
            <span className="ml-1 text-sm font-medium text-ink-muted">{t("dashboard.networkActivity.gwei")}</span>
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">{t("dashboard.networkActivity.gasPrice")}</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-ink-primary">
            {data.network_tps.toFixed(2)}
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">{t("dashboard.networkActivity.tps")}</p>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-[7rem]">
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
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
            {t("dashboard.networkActivity.collectingSamples")}
          </div>
        )}
      </div>

      {tableRows.length > 0 && (
        <Disclosure label={t("dashboard.networkActivity.viewData", { count: tableRows.length })}>
          <GenericTable items={tableRows} height="240px" />
        </Disclosure>
      )}
    </div>
  );
}
