import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { GiftIcon, LockClosedIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import TokenRow from "@/components/common/TokenRow";
import SensitiveValue from "@/components/common/SensitiveValue";
import GasSniperClaimStatus from "@/components/common/GasSniperClaimStatus";
import FtsoPortfolioCardSkeleton from "@/pages/Dashboard/components/skeletons/FtsoPortfolioCardSkeleton";
import { formatAmount } from "@/utils/format";

// Used to expose a manual "Claim Rewards" button here — removed now that
// Gas Sniper claims automatically once enabled (see GasSniperCard.jsx), so
// a manual claim action would just be redundant with, or worse, race
// against, the automation. Rather than leave the card's footer empty once
// the button's gone, it now reflects whichever of the two real states
// actually applies: already automated (Gas Sniper is on for this wallet),
// or not yet (a nudge toward turning it on) — never a static "automatically
// managed" claim that would be wrong for a wallet that hasn't opted in.
export default function FtsoPortfolioCard() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress, isActivePrimary } = useDerivedWalletHub(
    connectedAddress,
    isConnected,
  );
  const { data, isLoading, isError, isFetching, refetch } =
    useFtsoPortfolio(activeAddress);

  const unclaimed = data?.ftso_infrastructure?.cumulative_unclaimed_flr ?? 0;
  const hasData =
    data?.ftso_infrastructure && data?.realtime_estimation && data?.active_delegations;

  if (activeAddress && !isError && (isLoading || !hasData)) {
    return <FtsoPortfolioCardSkeleton />;
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">
          {t("dashboard.ftso.title")}
        </h3>
        {activeAddress &&
          !isError &&
          (isActivePrimary ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              {t("dashboard.ftso.connected")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              <LockClosedIcon className="h-3 w-3" />
              {t("dashboard.ftso.readOnly")}
            </span>
          ))}
      </div>

      {!activeAddress ? (
        <div className="py-8 text-center rounded-2xl bg-surface-inset px-4">
          <GiftIcon className="h-8 w-8 mx-auto text-ink-muted mb-2" />
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.common.noWalletSelected")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.ftso.connectToSeeRewards")}
          </p>
        </div>
      ) : isError ? (
        <div className="py-6 text-center rounded-2xl bg-surface-inset px-4">
          <p className="text-sm font-medium text-ink-primary">
            {t("dashboard.ftso.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.common.networkHiccup")}
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
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-divider">
            <TokenRow
              symbol="WFLR"
              label={t("dashboard.ftso.delegatedWflr")}
              value={<SensitiveValue>{formatAmount(data.ftso_infrastructure.user_wflr_balance)}</SensitiveValue>}
            />
            <TokenRow
              symbol="FLR"
              label={t("dashboard.ftso.unclaimedFlr")}
              value={<SensitiveValue>{formatAmount(unclaimed)}</SensitiveValue>}
              highlight
            />
            <TokenRow
              label={t("dashboard.ftso.activeDelegations")}
              value={data.active_delegations.length}
            />
            <TokenRow
              symbol="FLR"
              label={t("dashboard.ftso.estHourlyEarning")}
              value={<SensitiveValue>{`${formatAmount(data.realtime_estimation.estimated_hourly_earning)} FLR`}</SensitiveValue>}
            />
          </div>

          <GasSniperClaimStatus
            activeAddress={activeAddress}
            isActivePrimary={isActivePrimary}
            className="mt-4"
          />
        </>
      )}
    </div>
  );
}
