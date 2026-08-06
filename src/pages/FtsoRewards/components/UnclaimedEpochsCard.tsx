import { useTranslation } from "react-i18next";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { InboxIcon } from "@heroicons/react/24/outline";

import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import type { EpochPoint } from "@/pages/FtsoRewards/utils/deriveFtsoRewards";

const GRID_PROPS = { stroke: "#94A3B8", strokeOpacity: 0.15, strokeDasharray: "3 3" };
const TICK_STYLE = { fontSize: 10, fill: "#94A3B8" };

interface EpochTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  epochLabel: (id: number | undefined) => string;
}

function EpochTooltip({ active, payload, label, epochLabel }: EpochTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-surface-card px-3 py-2 text-xs shadow-lg border border-divider">
      <p className="text-ink-muted mb-1">{epochLabel(label)}</p>
      <p className="text-ink-primary font-medium">
        {payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 4 })} FLR
      </p>
    </div>
  );
}

interface UnclaimedEpochsCardProps {
  chart: { points: EpochPoint[] } | undefined;
  rawRows: { epoch: number; unclaimed_flr: number }[];
}

// Per-epoch amounts, not a cumulative total — each row here is still an
// independent unclaimed reward (this is a claimable ledger, not a vesting
// schedule), so a bar per epoch is the honest shape rather than implying
// a running balance the way an area chart would.
export default function UnclaimedEpochsCard({ chart, rawRows }: UnclaimedEpochsCardProps) {
  const { t } = useTranslation();
  const points = chart?.points ?? [];

  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <h3 className="text-sm font-semibold text-ink-primary">{t("ftsoRewards.epochs.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("ftsoRewards.epochs.subtitle")}</p>

      <div className="h-56 mt-4 min-w-0">
        {!points.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <InboxIcon className="h-8 w-8 text-ink-muted mb-2" />
            <p className="text-sm font-medium text-ink-primary">{t("ftsoRewards.epochs.emptyTitle")}</p>
            <p className="mt-0.5 text-xs text-ink-muted max-w-[220px]">
              {t("ftsoRewards.epochs.emptyDescription")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis
                dataKey="epochId"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => v.toLocaleString(undefined, { notation: "compact" })}
              />
              <Tooltip
                content={<EpochTooltip epochLabel={(id) => t("ftsoRewards.epochs.epochLabel", { id })} />}
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <Bar dataKey="amount" fill="#E62058" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {rawRows.length > 0 && (
        <Disclosure label={t("ftsoRewards.epochs.viewFullLedger", { count: rawRows.length })}>
          <GenericTable items={rawRows} height="240px" />
        </Disclosure>
      )}
    </div>
  );
}
