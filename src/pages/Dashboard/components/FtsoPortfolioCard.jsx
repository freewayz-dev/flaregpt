import { useAccount } from "wagmi";
import { toast } from "react-toastify";
import { GiftIcon, LockClosedIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import FtsoPortfolioCardSkeleton from "@/pages/Dashboard/components/skeletons/FtsoPortfolioCardSkeleton";

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Row({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-brand" : "text-ink-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function FtsoPortfolioCard() {
  const { address: connectedAddress, isConnected } = useAccount();
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
    toast.info("Claiming isn't available yet — coming soon.");
  };

  if (activeAddress && !isError && (isLoading || !hasData)) {
    return <FtsoPortfolioCardSkeleton />;
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">
          FTSO Delegation
        </h3>
        {activeAddress &&
          !isError &&
          (isActivePrimary ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              <LockClosedIcon className="h-3 w-3" />
              Read-only
            </span>
          ))}
      </div>

      {!activeAddress ? (
        <div className="py-8 text-center rounded-2xl bg-surface-inset px-4">
          <GiftIcon className="h-8 w-8 mx-auto text-ink-muted mb-2" />
          <p className="text-sm font-medium text-ink-primary">
            No wallet selected
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Connect or add a wallet in Settings to see rewards.
          </p>
        </div>
      ) : isError ? (
        <div className="py-6 text-center rounded-2xl bg-surface-inset px-4">
          <p className="text-sm font-medium text-ink-primary">
            Couldn't load FTSO portfolio
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
      ) : (
        <>
          <div className="divide-y divide-divider">
            <Row
              label="Delegated WFLR"
              value={formatAmount(data.ftso_infrastructure.user_wflr_balance)}
            />
            <Row
              label="Unclaimed FLR"
              value={formatAmount(unclaimed)}
              highlight
            />
            <Row
              label="Active Delegations"
              value={data.active_delegations.length}
            />
            <Row
              label="Est. Hourly Earning"
              value={`${formatAmount(data.realtime_estimation.estimated_hourly_earning)} FLR`}
            />
          </div>

          <button
            type="button"
            disabled={!canClaim}
            onClick={handleClaim}
            title={
              !isActivePrimary
                ? "Switch to your connected wallet to claim rewards"
                : unclaimed <= 0
                  ? "No unclaimed rewards yet"
                  : undefined
            }
            className={`mt-4 w-full rounded-xl py-2.5 text-sm font-medium transition-colors duration-150 ${
              canClaim
                ? "bg-brand text-white hover:bg-brand-hover cursor-pointer"
                : "bg-surface-inset text-ink-muted cursor-not-allowed"
            }`}
          >
            {isActivePrimary ? "Claim Rewards" : "Read-only — cannot claim"}
          </button>
        </>
      )}
    </div>
  );
}
