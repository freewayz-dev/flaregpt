import { useTranslation } from "react-i18next";
import { ClockIcon, GlobeAltIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useNetworkStatus, useNetworkEmissions } from "@/hooks/queries/useRflrQueries";
import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import MetricTile from "@/pages/DefiProtocols/components/shared/MetricTile";
import NetworkPulseSkeleton from "@/pages/RflrVesting/components/skeletons/NetworkPulseSkeleton";
import { formatDate } from "@/utils/format";
import type { TFunction } from "i18next";

function formatFlrCompact(value: number) {
  return `${Number(value).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })} FLR`;
}

function formatCountdown(seconds: number, t: TFunction) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  return days > 0
    ? t("rflrVesting.network.countdownDays", { days, hours })
    : t("rflrVesting.network.countdownHours", { hours });
}

// Global, network-wide data — not gated on a selected wallet at all, unlike
// every other section on this page. Fetches its own two queries directly
// (rather than receiving props from the page) since nothing here depends on
// activeAddress or the per-wallet melt-schedule/exit-quote data above.
export default function NetworkPulseSection() {
  const { t } = useTranslation();
  const statusQuery = useNetworkStatus();
  const emissionsQuery = useNetworkEmissions();

  const isError = statusQuery.isError || emissionsQuery.isError;
  const isFetching = statusQuery.isFetching || emissionsQuery.isFetching;
  // Deliberately `isSuccess`, not `isLoading` — `isLoading` is only true
  // while a first-ever fetch is actively in flight, so a query that's
  // paused (e.g. offline, with the default `networkMode: 'online'`) has
  // `isLoading === false` with no data and no error either. That combo
  // used to fall through the skeleton guard below straight into JSX
  // reading `statusData.next_distribution_date` etc. with no `?.`,
  // crashing on `Cannot read properties of undefined` — the same shape
  // bug the RflrVesting page itself shipped with (see its own fix).
  const isReady = statusQuery.isSuccess && emissionsQuery.isSuccess;

  const refetchAll = () => {
    statusQuery.refetch();
    emissionsQuery.refetch();
  };

  if (!isError && !isReady) return <NetworkPulseSkeleton />;

  // `isReady` above already proves both queries' `data` are present — TS
  // can't trace that through a separately-computed boolean, so these are
  // the narrowed locals the (non-error) JSX below actually reads. Unused
  // when `isError` is true, so the `!` here is never dereferenced unsafely.
  const statusData = statusQuery.data!;
  const emissionsData = emissionsQuery.data!;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center gap-1.5">
        <GlobeAltIcon className="h-4 w-4 text-ink-muted" />
        <h3 className="text-sm font-semibold text-ink-primary">{t("rflrVesting.network.title")}</h3>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">{t("rflrVesting.network.subtitle")}</p>

      {isError ? (
        <div role="alert" className="mt-4 rounded-2xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink-primary">
            {t("rflrVesting.network.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={refetchAll}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-surface-inset p-4">
              <div className="flex items-center gap-1.5 text-ink-muted mb-1">
                <ClockIcon className="h-3.5 w-3.5" />
                <p className="text-xs">{t("rflrVesting.network.nextDistribution")}</p>
              </div>
              <p className="text-lg font-semibold text-ink-primary">
                {formatDate(statusData.next_distribution_date)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-brand-text">
                {formatCountdown(statusData.seconds_until_next_epoch, t)}
              </p>
              <p className="mt-2 text-[11px] text-ink-muted">
                {t("rflrVesting.network.epochCaption", {
                  epoch: statusData.current_epoch_index,
                  date: formatDate(statusData.epoch_start),
                })}
              </p>
            </div>

            <div className="rounded-xl bg-surface-inset p-4">
              <p className="text-xs text-ink-muted mb-2.5">
                {t("rflrVesting.network.poolUtilization")}
              </p>
              <PoolOwnershipBar
                label={t("rflrVesting.network.allocated")}
                percentage={parseFloat(emissionsData.utilization_rate)}
                valueLabel={emissionsData.utilization_rate}
              />
              <p className="mt-2.5 text-[11px] text-ink-muted">
                {t("rflrVesting.network.remaining", {
                  amount: formatFlrCompact(
                    emissionsData.incentive_pool_status.remaining_to_be_assigned,
                  ),
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              label={t("rflrVesting.network.claimedToVesting")}
              value={formatFlrCompact(emissionsData.user_velocity.total_claimed_to_vesting)}
            />
            <MetricTile
              label={t("rflrVesting.network.withdrawnLiquid")}
              value={formatFlrCompact(emissionsData.user_velocity.total_withdrawn_liquid)}
            />
            <MetricTile
              label={t("rflrVesting.network.currentlyLocked")}
              value={formatFlrCompact(emissionsData.user_velocity.currently_locked_in_vesting)}
            />
          </div>
        </>
      )}
    </div>
  );
}
