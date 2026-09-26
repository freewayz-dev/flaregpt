import { useTranslation } from "react-i18next";
import { TrophyIcon } from "@heroicons/react/24/outline";

import RankingCardShell from "@/pages/FtsoRewards/components/RankingCardShell";
import RankingAvatar from "@/pages/FtsoRewards/components/RankingAvatar";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { useValidatorRankings } from "@/hooks/queries/useNetworkQueries";
import { computeValidatorRows, shortenNodeId, nodeIdInitial } from "@/pages/FtsoRewards/utils/deriveRankings";
import { formatFlr } from "@/utils/format";

// Same mobile stacking as ProviderRankingCard.jsx's own ProviderRow (see
// its comment) — this row packs even more into its trailing column (stake
// + uptime + fee, all on one line) than ProviderRow does, so it was the
// more cramped of the two on a phone.
function ValidatorRow({ row, t }) {
  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <RankingAvatar name={row.name} fallbackInitial={nodeIdInitial(row.nodeId)} />
        <div className="min-w-0 flex-1">
          {/* `name` is real (confirmed live) for only some validators — the
              backend returns a literal `null` for the rest (~40% of today's
              live set, not a rare edge case), meaning there's genuinely no
              registered display name to show, not a loading gap. Falling
              back to the NodeID as the *primary* line for those keeps this
              single-line and honest, instead of rendering a blank name line
              with the NodeID awkwardly demoted below it. */}
          {row.name ? (
            <>
              <p className="truncate text-sm font-medium text-ink-primary">{row.name}</p>
              <p className="truncate text-[11px] font-mono text-ink-muted">{shortenNodeId(row.nodeId)}</p>
            </>
          ) : (
            <p className="truncate text-sm font-mono font-medium text-ink-primary">
              {shortenNodeId(row.nodeId)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge
              label={row.connected ? t("rankings.connected") : t("rankings.disconnected")}
              tone={row.connected ? "success" : "neutral"}
              dot
            />
            <span className="text-[11px] text-ink-muted">
              {t("rankings.validators.delegatorCount", { count: row.delegatorCount })}
            </span>
          </div>
        </div>
      </div>
      <div className="pl-11 shrink-0 sm:pl-0 sm:text-right">
        <p className="text-sm font-semibold tabular-nums text-ink-primary">
          {formatFlr(row.stakeFlr, { maximumFractionDigits: 0 })}
        </p>
        <p className="text-[11px] text-ink-muted">
          {row.uptimePct}% {t("rankings.validators.uptime")} · {row.feePct}% {t("rankings.validators.fee")}
        </p>
      </div>
    </div>
  );
}

export default function ValidatorRankingCard() {
  const { t } = useTranslation();
  const query = useValidatorRankings(20);
  const rows = computeValidatorRows(query.data);

  return (
    <RankingCardShell
      icon={TrophyIcon}
      title={t("ftsoRewards.validators.title")}
      caption={t("ftsoRewards.validators.description")}
      isLoading={query.isLoading}
      isError={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      isEmpty={!query.isLoading && !query.isError && rows.length === 0}
      emptyTitle={t("rankings.noData")}
      emptyDescription={t("ftsoRewards.validators.emptyDescription")}
    >
      {rows.map((row) => (
        <ValidatorRow key={row.key} row={row} t={t} />
      ))}
    </RankingCardShell>
  );
}
