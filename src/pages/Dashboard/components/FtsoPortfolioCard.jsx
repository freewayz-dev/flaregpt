import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { toast } from "react-toastify";
import { GiftIcon, LockClosedIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import TokenRow from "@/components/common/TokenRow";
import FtsoPortfolioCardSkeleton from "@/pages/Dashboard/components/skeletons/FtsoPortfolioCardSkeleton";

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

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
  const canClaim = isActivePrimary && unclaimed > 0;
  const hasData =
    data?.ftso_infrastructure && data?.realtime_estimation && data?.active_delegations;

  const handleClaim = () => {
    // No claim contract/API exists yet — this demonstrates the permission
    // boundary (only the connected wallet can act) without pretending a
    // real transaction happens.
    toast.info(t("dashboard.ftso.claimComingSoon"));
  };

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
              value={formatAmount(data.ftso_infrastructure.user_wflr_balance)}
            />
            <TokenRow
              symbol="FLR"
              label={t("dashboard.ftso.unclaimedFlr")}
              value={formatAmount(unclaimed)}
              highlight
            />
            <TokenRow
              label={t("dashboard.ftso.activeDelegations")}
              value={data.active_delegations.length}
            />
            <TokenRow
              symbol="FLR"
              label={t("dashboard.ftso.estHourlyEarning")}
              value={`${formatAmount(data.realtime_estimation.estimated_hourly_earning)} FLR`}
            />
          </div>

          <button
            type="button"
            disabled={!canClaim}
            onClick={handleClaim}
            title={
              !isActivePrimary
                ? t("dashboard.ftso.switchToClaim")
                : unclaimed <= 0
                  ? t("dashboard.ftso.noUnclaimedYet")
                  : undefined
            }
            className={`mt-4 w-full rounded-xl py-2.5 text-sm font-medium transition-colors duration-150 ${
              canClaim
                ? "bg-brand text-white hover:bg-brand-hover cursor-pointer"
                : "bg-surface-inset text-ink-muted cursor-not-allowed"
            }`}
          >
            {isActivePrimary ? t("dashboard.ftso.claimRewards") : t("dashboard.ftso.readOnlyCannotClaim")}
          </button>
        </>
      )}
    </div>
  );
}
