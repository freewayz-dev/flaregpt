import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { ArrowPathIcon, WalletIcon, InboxIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useMeltSchedule, useExitQuote } from "@/hooks/queries/useRflrQueries";
import {
  computeVestingSummary,
  computeUnlockTimeline,
  buildMeltScheduleRows,
} from "@/pages/RflrVesting/utils/deriveVesting";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import RflrVestingSkeleton from "@/pages/RflrVesting/components/skeletons/RflrVestingSkeleton";
import VestingOverviewStats from "@/pages/RflrVesting/components/VestingOverviewStats";
import VestingProgressCard from "@/pages/RflrVesting/components/VestingProgressCard";
import UnlockTimelineCard from "@/pages/RflrVesting/components/UnlockTimelineCard";
import NetworkPulseSection from "@/pages/RflrVesting/components/NetworkPulseSection";

// exit-quote and melt-schedule are fetched independently (not as one
// combined gate) specifically because they don't behave alike: exit-quote
// is confirmed live to be fast and reliable for any wallet, while
// melt-schedule alone can take ~30s the first time a wallet is looked up
// (see useRflrQueries.js). An earlier version gated the whole page on
// *both* together, which meant switching to any wallet the backend hadn't
// already scanned held the KPIs and Vesting Progress — which have nothing
// to do with melt-schedule's data — hostage to that one slow request. Now
// the page renders as soon as exit-quote resolves, and only
// UnlockTimelineCard (the one thing that actually depends on
// melt-schedule) shows its own loading/error state while that catches up.
// Network Pulse below is unrelated to either — genuinely network-wide, not
// wallet-scoped — so it fetches and gates itself independently.
export default function RflrVesting() {
  const { t } = useTranslation();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);

  const exitQuoteQuery = useExitQuote(activeAddress);
  const meltScheduleQuery = useMeltSchedule(activeAddress);

  const summary = useMemo(
    () => (exitQuoteQuery.data ? computeVestingSummary(exitQuoteQuery.data) : null),
    [exitQuoteQuery.data],
  );
  const timeline = useMemo(
    () => (meltScheduleQuery.data ? computeUnlockTimeline(meltScheduleQuery.data) : null),
    [meltScheduleQuery.data],
  );
  const rawRows = useMemo(
    () => (meltScheduleQuery.data ? buildMeltScheduleRows(meltScheduleQuery.data, t) : []),
    [meltScheduleQuery.data, t],
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.rflrTracker")} description={t("rflrVesting.description")} />
      </div>

      {!activeAddress ? (
        <WalletEmptyState
          icon={WalletIcon}
          title={t("dashboard.common.noWalletSelected")}
          description={t("rflrVesting.connectToSee")}
        />
      ) : exitQuoteQuery.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("rflrVesting.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => exitQuoteQuery.refetch()}
            disabled={exitQuoteQuery.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${exitQuoteQuery.isFetching ? "animate-spin" : ""}`} />
            {exitQuoteQuery.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : !exitQuoteQuery.isSuccess ? (
        // Deliberately `!isSuccess`, not `isLoading` — `isLoading` is only
        // true while a first-ever fetch is *actively in flight*. A query
        // that has no data yet but also isn't loading or errored (most
        // commonly: the browser is offline and `networkMode: 'online'`
        // is holding the request paused rather than failing it) used to
        // fall through this chain straight into the branch below, which
        // reads `summary.hasNoRflr` on a `summary` that's still `null` —
        // the exact crash ("Cannot read properties of null") this page
        // shipped with. `!isSuccess` is the only condition that actually
        // guarantees `summary` is populated on the other side of it.
        <RflrVestingSkeleton />
      ) : summary.hasNoRflr ? (
        <WalletEmptyState
          icon={InboxIcon}
          title={t("rflrVesting.noRflr.title")}
          description={t("rflrVesting.noRflr.description")}
        />
      ) : (
        <>
          <VestingOverviewStats summary={summary} />
          {/* `grid-cols-1` (not just bare `grid`) matters here specifically:
              without it, Tailwind never sets `grid-template-columns` below
              `lg`, so the browser falls back to an implicit, content-sized
              (`auto`) track instead of `minmax(0, 1fr)`. GenericTable's own
              horizontal-scroll wrapper inside UnlockTimelineCard uses a
              `-mx-4` negative-margin bleed (see GenericTable.jsx), which is
              wider, intrinsically, than the card itself — on an `auto`
              track that width has nowhere to go but to push the whole grid
              item wider than the viewport the moment the table mounts
              (i.e. exactly when the schedule disclosure is expanded),
              which is what caused the horizontal shift. `minmax(0, 1fr)`
              lets the track (and the card in it) shrink below that
              content's intrinsic width instead, so the overflow is
              contained and scrolls *inside* GenericTable's own wrapper
              like it's meant to. */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <VestingProgressCard
              summary={summary}
              nextUnlock={timeline?.nextUnlock ?? null}
              isNextUnlockLoading={!timeline && meltScheduleQuery.isLoading}
            />
            <UnlockTimelineCard
              timeline={timeline}
              rawRows={rawRows}
              isLoading={meltScheduleQuery.isLoading}
              isError={meltScheduleQuery.isError}
              isFetching={meltScheduleQuery.isFetching}
              onRetry={() => meltScheduleQuery.refetch()}
            />
          </div>
        </>
      )}

      <NetworkPulseSection />
    </div>
  );
}
