import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import {
  useFlrPriceHistory,
  useFlrOhlc,
} from "@/hooks/queries/useDashboardQueries";
import { useUIStore } from "@/store/useUIStore";
import { useCurrency } from "@/hooks/useCurrency";
import FlrPriceChartSkeleton from "@/pages/Dashboard/components/skeletons/FlrPriceChartSkeleton";

const RANGES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "1Y", days: 365 },
];

function formatTick(timestamp, days) {
  const date = new Date(timestamp);
  return days <= 1
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// CoinGecko returns hourly (or finer) data points, so letting the chart
// library auto-pick ticks can land on multiple points from the same day and
// render duplicate-looking labels (e.g. "15 Jul" twice in a row). Picking a
// small, evenly-spaced set of ticks ourselves avoids that.
function pickTicks(data, count = 6) {
  if (!data?.length) return [];
  if (data.length <= count) return data.map((d) => d.timestamp);

  const step = (data.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    data[Math.round(i * step)].timestamp,
  );
}

// Renders one candle: a thin wick spanning high→low, and a body spanning
// open→close. Recharts positions the Bar's [low, high] range in pixel space
// via `y`/`height`, so the body/wick are derived by linearly interpolating
// open/high/low/close within that same pixel span rather than re-deriving a
// second scale.
function CandlestickShape(props) {
  const { x, y, width, height, payload } = props;
  const { open, high, low, close } = payload;
  if ([open, high, low, close].some((v) => v == null)) return null;

  const isBullish = close >= open;
  const color = isBullish ? "#10B981" : "#EF4444";
  const range = high - low || 1;
  const pixelForValue = (value) => y + ((high - value) / range) * height;

  const wickX = x + width / 2;
  const bodyTop = pixelForValue(Math.max(open, close));
  const bodyBottom = pixelForValue(Math.min(open, close));
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
  const bodyWidth = Math.max(width * 0.6, 2);
  const bodyX = x + (width - bodyWidth) / 2;

  return (
    <g>
      <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
    </g>
  );
}

function CandlestickTooltip({ active, payload, formatPrice }) {
  if (!active || !payload?.length) return null;
  const { open, high, low, close, timestamp } = payload[0].payload;

  return (
    <div className="rounded-xl bg-surface-card px-3 py-2 text-xs shadow-lg border border-divider">
      <p className="text-ink-muted mb-1">{new Date(timestamp).toLocaleString()}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink-primary">
        <span>O: {formatPrice(open)}</span>
        <span>C: {formatPrice(close)}</span>
        <span>H: {formatPrice(high)}</span>
        <span>L: {formatPrice(low)}</span>
      </div>
    </div>
  );
}

export default function FlrPriceChart() {
  const timeframe = useUIStore((state) => state.timeframe);
  const setTimeframe = useUIStore((state) => state.setTimeframe);
  const chartType = useUIStore((state) => state.chartType);
  const { formatCurrency } = useCurrency();

  const activeRange = RANGES.find((r) => r.label === timeframe) || RANGES[1];
  const days = activeRange.days;
  const isCandlestick = chartType === "Candlestick";

  const priceHistoryQuery = useFlrPriceHistory(days);
  const ohlcQuery = useFlrOhlc(days);
  const { data, isLoading, isError, isFetching, refetch } = isCandlestick
    ? ohlcQuery
    : priceHistoryQuery;

  const formatPrice = (value) =>
    formatCurrency(value, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const formatTickPrice = (value) =>
    value == null ? "" : formatCurrency(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const latest = isCandlestick ? data?.[data.length - 1]?.close : data?.[data.length - 1]?.price;
  const first = isCandlestick ? data?.[0]?.open : data?.[0]?.price;
  const changePct = latest != null && first ? ((latest - first) / first) * 100 : null;

  if (isLoading) return <FlrPriceChartSkeleton />;

  return (
    <div className="h-full min-w-0 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-primary">FLR Price</h3>
          {latest != null && (
            <p className="mt-1 text-2xl font-bold text-ink-primary truncate">
              {formatPrice(latest)}
              {changePct != null && (
                <span
                  className={`ml-2 text-sm font-medium ${
                    changePct >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(2)}%
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1 self-start shrink-0">
          {RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setTimeframe(range.label)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                timeframe === range.label
                  ? "bg-brand text-white"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 sm:h-64 mt-4 min-w-0">
        {isError || !data?.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-ink-primary">
              Couldn't load FLR price history
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
        ) : isCandlestick ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 0, right: 8, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.15} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={pickTicks(data)}
                tickFormatter={(ts) => formatTick(ts, days)}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={formatTickPrice}
              />
              <Tooltip content={<CandlestickTooltip formatPrice={formatPrice} />} />
              <Bar dataKey={(d) => [d.low, d.high]} shape={<CandlestickShape />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "Line" ? (
              <LineChart data={data} margin={{ left: 0, right: 8, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.15} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={pickTicks(data)}
                  tickFormatter={(ts) => formatTick(ts, days)}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={formatTickPrice}
                />
                <Tooltip
                  formatter={(value) => [formatPrice(value), "FLR"]}
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#E62058"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : (
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="flrPriceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E62058" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.15} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={pickTicks(data)}
                  tickFormatter={(ts) => formatTick(ts, days)}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={formatTickPrice}
                />
                <Tooltip
                  formatter={(value) => [formatPrice(value), "FLR"]}
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#E62058"
                  strokeWidth={2}
                  fill="url(#flrPriceGradient)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
