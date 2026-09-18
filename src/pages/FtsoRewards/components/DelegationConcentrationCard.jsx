import { useTranslation } from "react-i18next";
import { ScaleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

import StatCard from "@/components/cards/StatCard";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import InfoHint from "@/components/common/InfoHint";
import { useDelegationConcentration } from "@/hooks/queries/useNetworkQueries";

// concentration_band comes straight off the API as a raw label
// ("unconcentrated" / "moderately concentrated" / "highly concentrated")
// — mapped to this app's own translated copy and to StatusBadge's real
// tone set (success/warning/danger all already exist there) rather than
// displayed verbatim or given a new filled-pill treatment the rest of the
// app doesn't use anywhere else.
const BAND_CONFIG = {
  unconcentrated: { tone: "success", labelKey: "ftsoRewards.concentration.band.unconcentrated" },
  "moderately concentrated": {
    tone: "warning",
    labelKey: "ftsoRewards.concentration.band.moderatelyConcentrated",
  },
  "highly concentrated": {
    tone: "danger",
    labelKey: "ftsoRewards.concentration.band.highlyConcentrated",
  },
};

function ConcentrationChart({ history, t }) {
  if (!history.length) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-ink-muted text-center px-4">
        {t("ftsoRewards.concentration.chart.empty")}
      </div>
    );
  }

  // Deliberately not gated on `history.length > 1` the way
  // NetworkActivityChart.jsx gates its own "not enough points yet" chart —
  // the API's own doc note says a short history is expected early on and
  // asks for a chart that "looks sensible with 1 point as well as 90".
  // recharts already renders a single point as just a dot with no line
  // when there's nothing to connect it to, so no separate 1-point branch
  // is needed here.
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="concentrationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E62058" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#E62058" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          formatter={(value) => [value, t("ftsoRewards.concentration.stats.hhi")]}
          contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="hhi"
          stroke="#E62058"
          strokeWidth={2}
          fill="url(#concentrationGradient)"
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function DelegationConcentrationCard() {
  const { t } = useTranslation();
  const query = useDelegationConcentration();
  const current = query.data?.current;
  const history = query.data?.history ?? [];
  const note = query.data?.note;
  const band = current ? BAND_CONFIG[current.concentration_band] : null;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ScaleIcon className="h-4 w-4 text-ink-muted shrink-0" />
          <h3 className="text-sm font-semibold text-ink-primary truncate">
            {t("ftsoRewards.concentration.title")}
          </h3>
        </div>
        {band && (
          <StatusBadge label={t(band.labelKey)} tone={band.tone} dot />
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted max-w-md">
        {t("ftsoRewards.concentration.description")}
      </p>

      {query.isLoading ? (
        <div className="mt-4 space-y-3" role="status">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-28 rounded-xl" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink-primary">
            {t("ftsoRewards.concentration.couldntLoad")}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            {query.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard
              title={t("ftsoRewards.concentration.stats.hhi")}
              value={current.hhi}
              compact
              hint={
                <InfoHint label={t("ftsoRewards.concentration.help.hhi.label")}>
                  {t("ftsoRewards.concentration.help.hhi.body")}
                </InfoHint>
              }
            />
            <StatCard
              title={t("ftsoRewards.concentration.stats.effectiveProviders")}
              value={Math.round(current.effective_num_providers)}
              compact
            />
            <StatCard
              title={t("ftsoRewards.concentration.stats.activeProviders")}
              value={current.num_active_providers}
              compact
            />
          </div>

          <div className="mt-4 h-28">
            <ConcentrationChart history={history} t={t} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("ftsoRewards.concentration.table.caption")}</caption>
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="text-left font-medium py-1.5">
                    {t("ftsoRewards.concentration.table.group")}
                  </th>
                  <th className="text-right font-medium py-1.5">
                    {t("ftsoRewards.concentration.table.share")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                <tr>
                  <td className="py-2 text-ink-primary">
                    {t("ftsoRewards.concentration.table.top5")}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-ink-primary">
                    {current.top5_share_pct.toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-ink-primary">
                    {t("ftsoRewards.concentration.table.top10")}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-ink-primary">
                    {current.top10_share_pct.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {note && <p className="mt-3 text-[11px] text-ink-muted">{note}</p>}
        </>
      )}
    </div>
  );
}
