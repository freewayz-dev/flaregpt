import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

import type { ReactNode } from "react";

import TokenIcon from "@/components/common/TokenIcon";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import type {
  HistogramBucket,
  AssetBreakdownEntry,
  ActionBreakdownEntry,
} from "@/pages/WalletActivity/utils/deriveActivity";

const GRID_PROPS = { stroke: "#94A3B8", strokeOpacity: 0.15, strokeDasharray: "3 3" };
const TICK_STYLE = { fontSize: 10, fill: "#94A3B8" };

// `` on every ResponsiveContainer below (not a Recharts
// default — it's 0, meaning "redraw on every single resize event") is what
// keeps the sidebar's collapse/expand animation smooth on this page
// specifically. The sidebar's own width transition (see Sidebar.jsx)
// continuously resizes this page's main content area for ~300ms, and
// these three charts are the only ones in the app whose data volume scales
// directly with how much history a wallet actually has — a heavy wallet's
// daily histogram can be a few hundred bars. Redrawing that on every one of
// the dozens of resize events a single 300ms transition fires was the
// actual jank; other pages' charts (fixed-size price history, a handful of
// DeFi strategies) never had enough data for the same non-debounced
// behavior to be visible at all.

interface ChartCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  tableRows?: Record<string, unknown>[];
  tableLabel: string;
}

function ChartCard({ title, subtitle, children, tableRows, tableLabel }: ChartCardProps) {
  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      <div className="mt-4 h-52">{children}</div>
      {(tableRows?.length ?? 0) > 0 && (
        <Disclosure label={tableLabel}>
          <GenericTable items={tableRows} height="200px" />
        </Disclosure>
      )}
    </div>
  );
}

interface CountTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CountTooltip({ active, payload, label }: CountTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface-card px-2.5 py-1.5 text-xs shadow-lg">
      {label && <p className="font-medium text-ink-primary">{label}</p>}
      <p className="text-ink-secondary">{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

interface AssetTickProps {
  x: string | number;
  y: string | number;
  payload: { value: string };
}

function AssetTick({ x, y, payload }: AssetTickProps) {
  return (
    <foreignObject x={Number(x) - 68} y={Number(y) - 9} width={64} height={18}>
      <div className="flex h-full items-center justify-end gap-1 text-[10px] text-ink-muted">
        <TokenIcon symbol={payload.value} size={12} />
        <span className="truncate">{payload.value}</span>
      </div>
    </foreignObject>
  );
}

// Each chart's actual plot extracted to its own component so both the
// desktop grid (all three side by side) and the mobile single-chart view
// (one at a time, below a tab selector) render the identical chart body
// rather than maintaining two copies of the same recharts markup.
function ActivityByDayChart({ data }: { data: HistogramBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        <Bar dataKey="count" fill="#E62058" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AssetBreakdownChart({ data }: { data: AssetBreakdownEntry[] }) {
  const rows = data.slice(0, 6);
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <BarChart layout="vertical" data={rows} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} horizontal={false} />
        <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="asset"
          tick={(props: AssetTickProps) => <AssetTick {...props} />}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        <Bar dataKey="count" fill="#E62058" radius={[0, 3, 3, 0]} maxBarSize={16}>
          {rows.map((entry) => (
            <Cell key={entry.asset} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActionBreakdownChart({ data }: { data: ActionBreakdownEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <BarChart layout="vertical" data={data.slice(0, 6)} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} horizontal={false} />
        <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} width={88} />
        <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
        <Bar dataKey="count" fill="#E62058" radius={[0, 3, 3, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Equal-width, filled-pill-when-active buttons — the same shell
// ClaimsAndDelegationsSection's mobile tab toggle already uses, extended
// from 2 to 3. Considered the Donate page's CoinSelector pill-track
// instead (the other established segmented-control style in this app),
// but that one sizes each pill to its own content and scrolls
// horizontally once it doesn't fit — built for a longer, growing list of
// coins. Three short, fixed labels ("Activity"/"Assets"/"Actions") divide
// evenly across any phone width without needing that scroll affordance,
// so the simpler equal-width toggle is both the closer match to what's
// asked for and the one that doesn't add a mechanism (horizontal scroll)
// this case will never actually need.
type ChartTabId = "activity" | "assets" | "actions";

interface ChartTab {
  id: ChartTabId;
  label: string;
}

interface ChartTabsProps {
  tabs: ChartTab[];
  active: ChartTabId;
  onChange: (id: ChartTabId) => void;
}

function ChartTabs({ tabs, active, onChange }: ChartTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-inset p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
            active === tab.id ? "bg-brand text-white" : "text-ink-secondary hover:text-ink-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Every chart here is a plain *count* over fields the API actually
// returns (timestamp, asset, action_tag) — never an amount. Per the
// approved design review, an amount-based chart would mean plotting raw
// WFLR/sFLR/FLR quantities on one axis as if they were comparable, which
// they aren't without price data. Action breakdown only renders when more
// than one distinct action_tag is actually present in this wallet's
// history — with only "TOKEN_SEND" confirmed today, a chart with a single
// bar communicates nothing a KPI tile didn't already say more plainly.
interface ActivityChartsProps {
  dailyHistogram: HistogramBucket[];
  assetBreakdown: AssetBreakdownEntry[];
  actionBreakdown: ActionBreakdownEntry[];
}

export default function ActivityCharts({ dailyHistogram, assetBreakdown, actionBreakdown }: ActivityChartsProps) {
  const { t } = useTranslation();
  const showActionBreakdown = actionBreakdown.length > 1;
  const [activeTab, setActiveTab] = useState<ChartTabId>("activity");

  const tabs: ChartTab[] = [
    { id: "activity", label: t("wallet.activity.charts.tabActivity") },
    { id: "assets", label: t("wallet.activity.charts.tabAssets") },
    showActionBreakdown && { id: "actions", label: t("wallet.activity.charts.tabActions") },
  ].filter((tab): tab is ChartTab => Boolean(tab));

  // Switching away from "actions" if it ever stops being available (e.g.
  // a filter narrows the working set back down to one action type)
  // rather than leaving the tab row pointed at a chart that no longer
  // renders anything.
  const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "activity";

  return (
    <>
      {/* Desktop / tablet: all three side by side, unchanged. */}
      <div className={`hidden lg:grid gap-4 ${showActionBreakdown ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <ChartCard
          title={t("wallet.activity.charts.activityByDay")}
          subtitle={t("wallet.activity.charts.activityByDaySubtitle")}
          tableRows={dailyHistogram}
          tableLabel={t("wallet.activity.charts.viewData", { count: dailyHistogram.length })}
        >
          <ActivityByDayChart data={dailyHistogram} />
        </ChartCard>

        <ChartCard
          title={t("wallet.activity.charts.assetBreakdown")}
          subtitle={t("wallet.activity.charts.assetBreakdownSubtitle")}
          tableRows={assetBreakdown.slice(0, 6)}
          tableLabel={t("wallet.activity.charts.viewData", { count: Math.min(assetBreakdown.length, 6) })}
        >
          <AssetBreakdownChart data={assetBreakdown} />
        </ChartCard>

        {showActionBreakdown && (
          <ChartCard
            title={t("wallet.activity.charts.actionBreakdown")}
            subtitle={t("wallet.activity.charts.actionBreakdownSubtitle")}
            tableRows={actionBreakdown.slice(0, 6)}
            tableLabel={t("wallet.activity.charts.viewData", { count: Math.min(actionBreakdown.length, 6) })}
          >
            <ActionBreakdownChart data={actionBreakdown} />
          </ChartCard>
        )}
      </div>

      {/* Mobile: one chart at a time behind a tab selector, rather than
          three cards stacked one after another — same total information,
          far less scrolling to get past it to the actual transaction
          feed below. */}
      <div className="lg:hidden space-y-3">
        <ChartTabs tabs={tabs} active={effectiveTab} onChange={setActiveTab} />
        {effectiveTab === "activity" && (
          <ChartCard
            title={t("wallet.activity.charts.activityByDay")}
            subtitle={t("wallet.activity.charts.activityByDaySubtitle")}
            tableRows={dailyHistogram}
            tableLabel={t("wallet.activity.charts.viewData", { count: dailyHistogram.length })}
          >
            <ActivityByDayChart data={dailyHistogram} />
          </ChartCard>
        )}
        {effectiveTab === "assets" && (
          <ChartCard
            title={t("wallet.activity.charts.assetBreakdown")}
            subtitle={t("wallet.activity.charts.assetBreakdownSubtitle")}
            tableRows={assetBreakdown.slice(0, 6)}
            tableLabel={t("wallet.activity.charts.viewData", { count: Math.min(assetBreakdown.length, 6) })}
          >
            <AssetBreakdownChart data={assetBreakdown} />
          </ChartCard>
        )}
        {effectiveTab === "actions" && showActionBreakdown && (
          <ChartCard
            title={t("wallet.activity.charts.actionBreakdown")}
            subtitle={t("wallet.activity.charts.actionBreakdownSubtitle")}
            tableRows={actionBreakdown.slice(0, 6)}
            tableLabel={t("wallet.activity.charts.viewData", { count: Math.min(actionBreakdown.length, 6) })}
          >
            <ActionBreakdownChart data={actionBreakdown} />
          </ChartCard>
        )}
      </div>
    </>
  );
}
