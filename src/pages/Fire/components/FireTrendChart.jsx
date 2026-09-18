import { useTranslation } from "react-i18next";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

import InfoHint from "@/components/common/InfoHint";

// Headline "latest value + % change since the start of the visible
// window" over a small chart — same pattern FlrPriceChart already
// establishes on the Dashboard (big bold current value, a colored delta
// beside it, chart underneath) rather than a bare chart with only an axis
// label, which read as empty with nothing to actually anchor a number to.
function computeHeadline(points) {
  const latest = points[points.length - 1]?.accrued ?? 0;
  const first = points[0]?.accrued ?? null;
  const changePct = first ? ((latest - first) / first) * 100 : null;
  return { latest, changePct };
}

// Same single-hue gradient-area treatment as DelegationConcentrationCard's
// own trend chart (FTSO Rewards page) — this codebase's established
// pattern for "one metric, a short and still-growing daily history" rather
// than a new chart style. `isAnimationActive={false}` matches that same
// precedent (a short series re-fetching every few minutes shouldn't
// replay an entrance animation each time). Not gated on `points.length > 1`
// — recharts already renders a single point as a dot with nothing to
// connect it to, and a short-but-real history is expected here just like
// it is on that same reference chart.
function TokenTrendArea({ token, points, t }) {
  const gradientId = `fireTrend-${token}`;
  const { latest, changePct } = computeHeadline(points);

  return (
    <div className="rounded-xl bg-surface-inset p-3">
      <p className="text-xs font-medium text-ink-secondary">
        {t("fire.trend.tokenLabel", { token })}
      </p>
      <p className="mt-1 text-lg font-bold text-ink-primary truncate">
        {latest.toLocaleString(undefined, { maximumFractionDigits: 2 })} {token}
        {changePct != null && (
          <span
            className={`ml-2 text-xs font-medium ${
              changePct >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        )}
      </p>
      <div className="mt-2 h-20">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <AreaChart data={points} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E62058" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.periodId ?? ""}
              formatter={(value) => [
                value.toLocaleString(undefined, { maximumFractionDigits: 4 }),
                token,
              ]}
              contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="accrued"
              stroke="#E62058"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// `series` is FireOverviewV2's `daily_history`, already grouped by token
// (see deriveFireOverview.js) — one small area chart per token actually
// present, rather than one combined chart, since FLR and FXRP amounts
// aren't the same unit and shouldn't share an axis. Fire/index.jsx only
// renders this component at all when there's at least one series with
// points — same "not worth a whole chart with nothing to show" reasoning
// FireBreakdownChart already applies to its own single-pool case.
export default function FireTrendChart({ series }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <span className="flex items-center gap-1">
        <h3 className="text-sm font-semibold text-ink-primary">{t("fire.trend.title")}</h3>
        <InfoHint label={t("fire.trend.help.label")}>{t("fire.trend.help.body")}</InfoHint>
      </span>
      <p className="mt-0.5 text-xs text-ink-muted">{t("fire.trend.subtitle")}</p>
      <div className={`mt-4 grid gap-3 ${series.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {series.map(({ token, points }) => (
          <TokenTrendArea key={token} token={token} points={points} t={t} />
        ))}
      </div>
    </div>
  );
}
