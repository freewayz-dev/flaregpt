import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

// Deliberately small and inline — a sparkline-with-a-bit-more-presence,
// not a dashboard widget. Reused only for questions that are fundamentally
// about change over time ("why did my rewards decrease"); most answers
// have no chart at all, by design (see the FlareGPT design review: charts
// add value selectively, not by default).
export default function ChartBlock({ points, trend, caption }) {
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const pctChange = first ? ((last - first) / first) * 100 : 0;
  const isDown = trend === "down" || pctChange < 0;

  return (
    <div className="rounded-xl bg-surface-inset p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-ink-muted">{caption}</p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
            isDown ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {isDown ? (
            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
          )}
          {pctChange > 0 ? "+" : ""}
          {pctChange.toFixed(1)}%
        </span>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="flrgptChartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E62058" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
              formatter={(value) => [value, ""]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#E62058"
              strokeWidth={2}
              fill="url(#flrgptChartGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
