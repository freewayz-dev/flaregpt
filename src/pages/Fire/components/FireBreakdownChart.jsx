import { useTranslation } from "react-i18next";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import { useCurrency } from "@/hooks/useCurrency";

const GRID_PROPS = { stroke: "#94A3B8", strokeOpacity: 0.15, strokeDasharray: "3 3" };
const TICK_STYLE = { fontSize: 10, fill: "#94A3B8" };

// Truncates via CSS (a `foreignObject`, same technique
// ActivityCharts.jsx's own AssetTick uses for its Y-axis labels), not by
// slicing the string — pool labels vary a lot in length ("AU" vs "Minting
// tags (referral/attribution fees)"), and letting the browser's own
// ellipsis handle that adapts to the actual rendered width instead of a
// fixed character count that's too aggressive for short labels and not
// aggressive enough for long ones.
function CategoryTick({ x, y, payload }) {
  return (
    <foreignObject x={0} y={Number(y) - 9} width={Number(x) - 8} height={18}>
      <div className="flex h-full items-center justify-end text-[10px] text-ink-muted">
        <span className="truncate">{payload.value}</span>
      </div>
    </foreignObject>
  );
}

function ValueTooltip({ active, payload, formatCurrency }) {
  if (!active || !payload?.length) return null;
  const { label, usd_value: usdValue } = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface-card px-2.5 py-1.5 text-xs shadow-lg max-w-[220px]">
      <p className="font-medium text-ink-primary">{label}</p>
      <p className="text-ink-secondary tabular-nums">{formatCurrency(usdValue)}</p>
    </div>
  );
}

// Single-hue horizontal bar, matching this app's own established
// "breakdown by category" convention exactly (see WalletActivity's
// AssetBreakdownChart/ActionBreakdownChart) — magnitude is encoded by bar
// length, identity by the Y-axis label each bar already carries, so no
// per-category color palette is needed (and none exists as precedent
// anywhere else in this app for this exact chart shape). Same brand red,
// same grid/tick styling, same rounded end-cap radius as every other
// single-series chart in the dashboard.
export default function FireBreakdownChart({ pools }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const data = [...pools].sort((a, b) => b.usd_value - a.usd_value);

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{t("fire.chart.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("fire.chart.subtitle")}</p>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <BarChart layout="vertical" data={data} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCurrency(value, { maximumFractionDigits: 0 })}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={(props) => <CategoryTick {...props} />}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip
              content={<ValueTooltip formatCurrency={formatCurrency} />}
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
            />
            <Bar dataKey="usd_value" fill="#E62058" radius={[0, 3, 3, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
