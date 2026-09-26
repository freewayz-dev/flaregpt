import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CalendarDaysIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";


function formatTick(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

// Mirrors FlrPriceChart's own tick-thinning helper — evenly spaced ticks
// picked from the real data points rather than left to the chart library's
// auto axis, which can land on several same-month points in a row here.
function pickTicks(points, count = 6) {
  if (!points.length) return [];
  if (points.length <= count) return points.map((p) => p.timestamp);
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => points[Math.round(i * step)].timestamp);
}



function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, amount, cumulative } = payload[0].payload;
  return (
    <div className="rounded-xl bg-surface-card px-3 py-2 text-xs shadow-lg border border-divider">
      <p className="text-ink-muted mb-1">
        {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>
      <p className="text-ink-primary font-medium">
        +{amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} FLR
      </p>
      <p className="text-ink-muted">
        {cumulative.toLocaleString(undefined, { maximumFractionDigits: 2 })} FLR {" "}
        <span className="text-[10px]">total unlocked</span>
      </p>
    </div>
  );
}

// Fetches noticeably less reliably than every other card on this page —
// confirmed live, melt-schedule alone can take ~30s for a wallet the
// backend hasn't scanned before (and occasionally 500s on an upstream rate
// limit while doing that scan), while exit-quote (everything else on this
// page depends on) is consistently sub-second. Gating the whole page on
// melt-schedule the way an earlier version did meant switching to any
// "new" wallet held the KPIs and Vesting Progress hostage to this one
// slow, less reliable request — so this card alone owns and displays its
// own loading/error state instead of receiving pre-loaded props, the one
// exception to this page's usual "parent fetches, children just render"
// split (see index.jsx).
//
// One series (cumulative unlocked FLR) — no legend needed, and plotting the
// per-date `amount` on a second axis alongside it was deliberately dropped:
// the two measures differ by orders of magnitude (a single installment vs.
// the running total), which is exactly the dual-axis chart this app's own
// charts avoid elsewhere. The per-point amount is still available in the
// tooltip; it just isn't a second plotted line.


export default function UnlockTimelineCard({
  timeline,
  rawRows,
  isLoading,
  isError,
  isFetching,
  onRetry,
}) {
  const { t } = useTranslation();
  const points = timeline?.points ?? [];

  return (
    <div className="h-full min-w-0 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <h3 className="text-sm font-semibold text-ink-primary">{t("rflrVesting.timeline.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("rflrVesting.timeline.subtitle")}</p>
      {/* The schedule's own running total can legitimately exceed the
          Vesting Progress card's "Total Balance" above — that KPI is the
          current outstanding balance (exit-quote), while this is the full
          historical log of unlock events (melt-schedule), which can include
          amounts already claimed or moved elsewhere. Called out explicitly
          so the two numbers not matching doesn't read as a bug. */}
      {points.length > 0 && (
        <p className="mt-1 text-[11px] text-ink-muted">{t("rflrVesting.timeline.historicalNote")}</p>
      )}

      <div className="h-56 mt-4 min-w-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <ArrowPathIcon className="h-6 w-6 text-ink-muted mb-2 animate-spin" />
            <p className="text-sm font-medium text-ink-primary">
              {t("rflrVesting.timeline.loadingTitle")}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted max-w-[220px]">
              {t("rflrVesting.timeline.loadingHint")}
            </p>
          </div>
        ) : isError ? (
          <div role="alert" className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-ink-primary">
              {t("rflrVesting.timeline.couldntLoad")}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
            <button
              type="button"
              onClick={onRetry}
              disabled={isFetching}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
            </button>
          </div>
        ) : !points.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <CalendarDaysIcon className="h-8 w-8 text-ink-muted mb-2" />
            <p className="text-sm font-medium text-ink-primary">
              {t("rflrVesting.timeline.emptyTitle")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ left: 0, right: 8, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="rflrUnlockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E62058" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.15} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={pickTicks(points)}
                tickFormatter={formatTick}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => v.toLocaleString(undefined, { notation: "compact" })}
              />
              <Tooltip content={<TimelineTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#E62058"
                strokeWidth={2}
                fill="url(#rflrUnlockGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {rawRows.length > 0 && (
        <Disclosure label={t("rflrVesting.timeline.viewFullSchedule", { count: rawRows.length })}>
          <GenericTable items={rawRows} height="240px" />
        </Disclosure>
      )}
    </div>
  );
}
