import { useTranslation } from "react-i18next";
import { ShieldCheckIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { useValidatorStakes, useValidatorRankings } from "@/hooks/queries/useNetworkQueries";
import { computeStakeSummary } from "@/pages/FtsoRewards/utils/deriveValidatorStakes";
import { shortenNodeId } from "@/pages/FtsoRewards/utils/deriveRankings";
import { formatFlr, formatDate } from "@/utils/format";

// Confirmed live "https://portal.flare.network/" is the real, current
// staking entry point (GET /api/v1/links, id "flare-portal") — used
// directly here rather than a second query dependency just for one URL.
const FLARE_PORTAL_URL = "https://portal.flare.network/";

function NodeStakeRow({ node, connectedInfo, t }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-mono font-medium text-ink-primary">{shortenNodeId(node.nodeId)}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {connectedInfo && (
            <StatusBadge
              label={connectedInfo.connected ? t("rankings.connected") : t("rankings.disconnected")}
              tone={connectedInfo.connected ? "success" : "neutral"}
              dot
            />
          )}
          {node.nextUnlock && (
            <span className="text-[11px] text-ink-muted">
              {t("rankings.yourStake.nextUnlock", { date: formatDate(node.nextUnlock) })}
            </span>
          )}
        </div>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-primary">
        {formatFlr(node.totalFlr, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

// Personal, wallet-scoped — deliberately its own card, not folded into
// ValidatorRankingCard's public leaderboard (see FtsoRewards/index.jsx's own
// comment on why this is placed independently of the FTSO portfolio query).
// Works for either a connected wallet or a watchlist-only one, same as
// every other wallet-scoped card on this page.
//
// The populated ("STAKED") shape below is real, confirmed live — not
// guessed. No test wallet with an active P-chain stake could be found by
// trying known FTSO-provider/staking-infrastructure addresses (see git
// history for that attempt), so it was found a different way: Flare mirrors
// every P-chain stake onto a C-chain contract (`PChainStakeMirror`, address
// 0x7b61F9F27153a4F2F57Dc30bF08A8eb0cCB96C22, resolved via the
// FlareContractRegistry) specifically so C-chain consumers — this backend
// included — can look up a wallet's stake. Reading that contract's own
// `StakeConfirmed` events off the real public RPC surfaced real C-chain
// addresses with a currently-nonzero `balanceOf`; one of those
// (0x725789BAdFeDa0DE546e3D91f2E64115Ba4Face3) was then tested directly
// against this endpoint and returned the shape this component renders.
export default function YourValidatorStakeCard({ activeAddress }) {
  const { t } = useTranslation();
  const query = useValidatorStakes(activeAddress);
  // Same query/cache entry ValidatorRankingCard already holds open on this
  // page (identical queryKey) — this doesn't add a second network request,
  // it's only here to opportunistically resolve connected/uptime for
  // whichever of this wallet's nodes also happen to be in the public
  // top-20 list, since validator-stakes itself never populates those
  // fields (see deriveValidatorStakes.js).
  const rankingsQuery = useValidatorRankings(20);

  if (!activeAddress) {
    return (
      <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
        <h3 className="text-sm font-semibold text-ink-primary">{t("rankings.yourStake.title")}</h3>
        <div className="mt-4">
          <WalletEmptyState
            icon={ShieldCheckIcon}
            title={t("dashboard.common.noWalletSelected")}
            description={t("rankings.yourStake.connectToSee")}
          />
        </div>
      </div>
    );
  }

  const connectedByNodeId = new Map(
    (rankingsQuery.data?.validators ?? []).map((v) => [v.node_id, { connected: v.connected }]),
  );

  const summary = query.data?.status === "STAKED" ? computeStakeSummary(query.data) : null;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 text-ink-muted shrink-0" />
          <h3 className="text-sm font-semibold text-ink-primary">{t("rankings.yourStake.title")}</h3>
        </div>
        {summary && summary.totalFlr > 0 && (
          <p className="text-sm font-semibold tabular-nums text-ink-primary">
            {formatFlr(summary.totalFlr, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {query.isLoading ? (
        <div role="status" className="mt-4 space-y-2">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink-primary">{t("rankings.couldntLoad")}</p>
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
      ) : summary && summary.nodes.length > 0 ? (
        <div className="mt-3 divide-y divide-divider max-h-[280px] overflow-y-auto overscroll-y-contain scrollbar-none">
          {summary.nodes.map((node) => (
            <NodeStakeRow key={node.nodeId} node={node} connectedInfo={connectedByNodeId.get(node.nodeId)} t={t} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink-primary">{t("rankings.yourStake.notStakedTitle")}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{t("rankings.yourStake.notStakedDescription")}</p>
          <a
            href={FLARE_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer"
          >
            {t("rankings.yourStake.stakeCta")}
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
