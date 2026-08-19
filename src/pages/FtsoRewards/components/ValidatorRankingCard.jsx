import { useTranslation } from "react-i18next";
import { TrophyIcon } from "@heroicons/react/24/outline";

import RankingCardShell from "@/pages/FtsoRewards/components/RankingCardShell";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import { useValidatorRankings } from "@/hooks/queries/useNetworkQueries";
import { computeValidatorRows, shortenNodeId } from "@/pages/FtsoRewards/utils/deriveRankings";
import { formatFlr } from "@/utils/format";

function ValidatorRow({ row, rank, t }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-[11px] font-semibold text-ink-muted">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-mono font-medium text-ink-primary">
          {shortenNodeId(row.nodeId)}
        </p>
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
      <div className="shrink-0 text-right">
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

// No name resolution exists for validators (confirmed via the backend's
// own OpenAPI description and live data — only `node_id`), unlike
// providers' real `name` field, so the primary label here is the
// (shortened) NodeID itself rather than a made-up display name.
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
      {rows.map((row, i) => (
        <ValidatorRow key={row.key} row={row} rank={i + 1} t={t} />
      ))}
    </RankingCardShell>
  );
}
