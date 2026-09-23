import { useTranslation } from "react-i18next";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

// Headline "latest value + % change since the start of the visible window"
// over a small chart — same pattern FireTrendChart/FlrPriceChart already
// establish (big bold current value, a colored delta beside it, chart
// underneath) rather than a bare chart with only an axis label.
function computeHeadline(points) {
  const latest = points[points.length - 1]?.value ?? 0;
  const first = points[0]?.value ?? null;
  const changePct = first ? ((latest - first) / first) * 100 : null;
  return { latest, changePct };
}

// Minted and redeemed are two different *facets* of the same FXRP amount,
// not two different tokens — but this still follows FireTrendChart's exact
// small-multiples treatment (one single-hue area chart per facet, brand red
// throughout) rather than overlaying both as two series on one chart.
// That's a deliberate reuse of the established pattern, not a shortcut:
// this codebase has no existing two-series-on-one-axis chart to copy, and
// introducing a second series color here would mean picking a brand-new
// hue for a single feature — exactly what CLAUDE.md's chart/color rules
// warn against. Identity comes from each panel's own label, the same way
// FireTrendChart's FLR/FXRP panels share one color and are told apart by
// their headings, not by hue.
function FlowTrendArea({ facet, points, t }) {
  const gradientId = `fassetsTrend-${facet}`;
  const { latest, changePct } = computeHeadline(points);

  return (
    <div className="rounded-xl bg-surface-inset p-3">
      <p className="text-xs font-medium text-ink-secondary">{t(`fassets.trend.facet.${facet}`)}</p>
      <p className="mt-1 text-lg font-bold text-ink-primary truncate">
        {latest.toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP
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
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
              formatter={(value) => [
                value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                "FXRP",
              ]}
              contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
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

// `series` is FassetsOverview's `trend_daily`, already split into two
// facets by deriveFassetsOverview.js's computeFlowTrend. Fassets/index.jsx
// only renders this component at all when there's at least one facet with
// points — same "not worth a chart with nothing to show" reasoning
// FireTrendChart/FireBreakdownChart already apply to their own empty cases.
export default function FassetsTrendChart({ series }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{t("fassets.trend.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("fassets.trend.subtitle")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {series.map(({ facet, points }) => (
          <FlowTrendArea key={facet} facet={facet} points={points} t={t} />
        ))}
      </div>
    </div>
  );
}
