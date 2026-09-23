import { useTranslation } from "react-i18next";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

import MetricTile from "@/pages/DefiProtocols/components/shared/MetricTile";
import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import InfoHint from "@/components/common/InfoHint";
import { useCurrency } from "@/hooks/useCurrency";

function formatFxrp(value) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP`;
}

// `flow_24h` and `limits` are both FlareMetrics-only (null on the on-chain-
// fallback response, same as proof_of_reserve) and independent of each
// other — Fassets/index.jsx renders this card whenever at least one is
// present, and each half below renders only its own piece.
//
// `payment_defaults` (mint reservations that expired unpaid) is
// deliberately rendered as a plain neutral tile, same visual weight as
// every other number here — a mint that simply didn't complete in time,
// not a red flag, so no warning color/icon is used for it despite living
// right next to a genuinely colored net-flow figure.
//
// `pendingRedemptions` comes from a completely different query
// (Fassets/index.jsx sums `redeeming_fxrp` across the agents list — see
// computePendingRedemptions) than `flow`/`limits` (both from the overview
// query) — `null` specifically means "agents hasn't loaded yet", not "zero
// pending", so the tile is simply omitted until a real number exists
// rather than flashing a misleading 0.
export default function FassetsFlowCard({ flow, limits, pendingRedemptions }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const isNetPositive = flow ? flow.net_fxrp >= 0 : true;
  const showPending = pendingRedemptions != null;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center gap-1.5">
        <ArrowsRightLeftIcon className="h-4 w-4 text-ink-muted" />
        <h3 className="text-sm font-semibold text-ink-primary">{t("fassets.flow.title")}</h3>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">{t("fassets.flow.subtitle")}</p>

      {flow && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              label={t("fassets.flow.mints")}
              value={formatFxrp(flow.mints_completed.fxrp)}
              caption={`${t("fassets.flow.txCount", { count: flow.mints_completed.tx })} · ${formatCurrency(flow.mints_completed.usd, { maximumFractionDigits: 0 })}`}
            />
            <MetricTile
              label={t("fassets.flow.redemptions")}
              value={formatFxrp(flow.redemptions.fxrp)}
              caption={`${t("fassets.flow.txCount", { count: flow.redemptions.tx })} · ${formatCurrency(flow.redemptions.usd, { maximumFractionDigits: 0 })}`}
            />
            <MetricTile
              label={t("fassets.flow.netFlow")}
              value={
                <span className={isNetPositive ? "text-emerald-500" : "text-red-500"}>
                  {isNetPositive ? "+" : ""}
                  {formatFxrp(flow.net_fxrp)}
                </span>
              }
            />
          </div>

          <div className={`mt-3 grid grid-cols-1 gap-3 ${showPending ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <MetricTile
              label={t("fassets.flow.mintSuccessRate")}
              value={`${flow.mint_success_rate_pct.toFixed(1)}%`}
            />
            <MetricTile
              label={t("fassets.flow.paymentDefaults")}
              value={flow.payment_defaults}
              caption={t("fassets.flow.paymentDefaultsCaption")}
            />
            {showPending && (
              <MetricTile
                label={t("fassets.flow.pendingRedemptions")}
                value={formatFxrp(pendingRedemptions)}
                caption={t("fassets.flow.pendingRedemptionsCaption")}
              />
            )}
          </div>
        </>
      )}

      {/* `redeeming_fxrp` (source of `pendingRedemptions`) comes from the
          agents endpoint, which has no fallback/degraded concept at all
          (it's "fully on-chain, no third party" per its own note) — unlike
          `flow`/`limits`, it's never null because of a degraded overview
          response. This standalone tile is what keeps a real, available
          number from being silently dropped on the rare path where the
          overview came back on-chain-fallback (no flow_24h) but the agents
          list still loaded fine. */}
      {!flow && showPending && (
        <div className="mt-4">
          <MetricTile
            label={t("fassets.flow.pendingRedemptions")}
            value={formatFxrp(pendingRedemptions)}
            caption={t("fassets.flow.pendingRedemptionsCaption")}
          />
        </div>
      )}

      {/* `limits` — how much of today's network-wide minting allowance has
          already been used. Independent of flow_24h above (a rolling
          window vs. a calendar-day cap), so it's its own bar rather than a
          sixth tile crowded into the grid above. */}
      {limits && (
        <div className={flow ? "mt-4 pt-4 border-t border-divider" : "mt-4"}>
          <p className="mb-1.5 flex items-center gap-1 text-xs text-ink-muted">
            {t("fassets.flow.dailyLimit")}
            <InfoHint label={t("fassets.flow.dailyLimit")}>
              {t("fassets.flow.dailyLimitHelp")}
            </InfoHint>
          </p>
          <PoolOwnershipBar
            label={t("fassets.flow.dailyLimitUsed")}
            percentage={
              limits.daily_limit_fxrp
                ? (limits.daily_minted_fxrp / limits.daily_limit_fxrp) * 100
                : 0
            }
            valueLabel={t("fassets.flow.dailyLimitValue", {
              used: formatFxrp(limits.daily_minted_fxrp),
              limit: formatFxrp(limits.daily_limit_fxrp),
            })}
          />
        </div>
      )}
    </div>
  );
}
