import { useTranslation } from "react-i18next";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";

import RankingCardShell from "@/pages/FtsoRewards/components/RankingCardShell";
import { useFtsoProviderRankings } from "@/hooks/queries/useNetworkQueries";
import { computeProviderRows } from "@/pages/FtsoRewards/utils/deriveRankings";
import { shortenAddress } from "@/utils/address";

function ProviderRow({ row, rank }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-[11px] font-semibold text-ink-muted">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-primary">{row.name}</p>
        <p className="truncate text-[11px] font-mono text-ink-muted">{shortenAddress(row.address)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-ink-primary">
          {row.weightSharePct.toFixed(2)}%
        </p>
        <p className="text-[11px] text-ink-muted">{row.feePct}% fee</p>
      </div>
    </div>
  );
}

// Ranked by live on-chain delegated vote weight and fee — explicitly NOT a
// "best provider" leaderboard (the backend's own docs are clear reward
// performance "isn't reliably queryable on-chain"). The caption below says
// so directly rather than implying otherwise through a bare percentage
// column, which is what "ranking" + "%" next to each other would otherwise
// read as.
export default function ProviderRankingCard() {
  const { t } = useTranslation();
  const query = useFtsoProviderRankings(20);
  const rows = computeProviderRows(query.data);

  return (
    <RankingCardShell
      icon={BuildingLibraryIcon}
      title={t("ftsoRewards.providers.title")}
      caption={t("ftsoRewards.providers.description")}
      isLoading={query.isLoading}
      isError={query.isError}
      isFetching={query.isFetching}
      onRetry={() => query.refetch()}
      isEmpty={!query.isLoading && !query.isError && rows.length === 0}
      emptyTitle={t("rankings.noData")}
      emptyDescription={t("ftsoRewards.providers.emptyDescription")}
    >
      {rows.map((row, i) => (
        <ProviderRow key={row.key} row={row} rank={i + 1} />
      ))}
    </RankingCardShell>
  );
}
