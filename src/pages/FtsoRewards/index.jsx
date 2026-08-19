import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { ArrowPathIcon, WalletIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import GasSniperClaimStatus from "@/components/common/GasSniperClaimStatus";
import {
  computeRewardsSummary,
  computeDelegationRows,
  computeEpochLedgerChart,
  buildEpochLedgerRows,
} from "@/pages/FtsoRewards/utils/deriveFtsoRewards";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import FtsoRewardsSkeleton from "@/pages/FtsoRewards/components/skeletons/FtsoRewardsSkeleton";
import RewardsOverviewStats from "@/pages/FtsoRewards/components/RewardsOverviewStats";
import RewardVelocityCard from "@/pages/FtsoRewards/components/RewardVelocityCard";
import DelegationsCard from "@/pages/FtsoRewards/components/DelegationsCard";
import UnclaimedEpochsCard from "@/pages/FtsoRewards/components/UnclaimedEpochsCard";
import RankingTablesSection from "@/pages/FtsoRewards/components/RankingTablesSection";
import YourValidatorStakeCard from "@/pages/FtsoRewards/components/YourValidatorStakeCard";

// Single endpoint (GET /api/v1/portfolio/ftso/{wallet}) backs the whole
// personal-rewards half of this page, so — unlike rFLR Vesting's two
// independently-behaved endpoints — one query cleanly gates everything
// here. Gas Sniper's status (GasSniperClaimStatus) is fetched separately
// (global, not wallet-specific data) purely to decide what the auto-claim
// status note below the KPI row says; it never blocks or gates the rest
// of the page.
export default function FtsoRewards() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress, isActivePrimary } = useDerivedWalletHub(connectedAddress, isConnected);

  const portfolioQuery = useFtsoPortfolio(activeAddress);

  const hasData =
    portfolioQuery.data?.ftso_infrastructure &&
    portfolioQuery.data?.realtime_estimation &&
    portfolioQuery.data?.active_delegations;

  const summary = useMemo(
    () => (portfolioQuery.data ? computeRewardsSummary(portfolioQuery.data) : null),
    [portfolioQuery.data],
  );
  const delegations = useMemo(
    () => (portfolioQuery.data ? computeDelegationRows(portfolioQuery.data) : []),
    [portfolioQuery.data],
  );
  const epochChart = useMemo(
    () => (portfolioQuery.data ? computeEpochLedgerChart(portfolioQuery.data) : { points: [] }),
    [portfolioQuery.data],
  );
  const epochRows = useMemo(
    () => (portfolioQuery.data ? buildEpochLedgerRows(portfolioQuery.data) : []),
    [portfolioQuery.data],
  );

  // `hasData` above already proves `summary` is non-null by the time the
  // JSX below renders it — TS can't trace that through a separately-
  // computed `useMemo`, so this narrows it back; unused (and therefore
  // never unsafely dereferenced) in every earlier branch.
  const rewardsSummary = summary;

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.ftsoRewards")} description={t("ftsoRewards.description")} />
      </div>

      {!activeAddress ? (
        <WalletEmptyState
          icon={WalletIcon}
          title={t("dashboard.common.noWalletSelected")}
          description={t("ftsoRewards.connectToSee")}
        />
      ) : portfolioQuery.isLoading || (!hasData && !portfolioQuery.isError) ? (
        <FtsoRewardsSkeleton />
      ) : portfolioQuery.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("ftsoRewards.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => portfolioQuery.refetch()}
            disabled={portfolioQuery.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${portfolioQuery.isFetching ? "animate-spin" : ""}`} />
            {portfolioQuery.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          <RewardsOverviewStats summary={rewardsSummary} />

          {/* Answers "how do these get claimed" right where the headline
              Unclaimed Rewards number lives, rather than attached to the
              epoch-by-epoch ledger further down the page — that card is
              about the breakdown/history, not about claiming mechanics, so
              burying the claim-status note inside it made it read as an
              unrelated aside instead of a direct answer. Shown regardless
              of current unclaimed balance — see GasSniperClaimStatus. */}
          <GasSniperClaimStatus activeAddress={activeAddress} isActivePrimary={isActivePrimary} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RewardVelocityCard summary={rewardsSummary} />
            <DelegationsCard delegations={delegations} />
          </div>
          <UnclaimedEpochsCard chart={epochChart} rawRows={epochRows} />
        </>
      )}

      {/* Independent of the FTSO portfolio query above (`portfolioQuery`) —
          validator staking is a separate P-Chain mechanism from FTSO
          delegation, with its own endpoint and its own loading/error/no-
          wallet handling, so it isn't gated by that query's own
          hasData/isError state the way the rest of this page's personal
          cards are. Placed between the personal FTSO content and the
          public rankings below specifically so "yours" and "everyone's"
          never visually blur together. */}
      <YourValidatorStakeCard activeAddress={activeAddress} />

      <RankingTablesSection />
    </div>
  );
}
