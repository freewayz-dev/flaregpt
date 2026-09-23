import { useTranslation } from "react-i18next";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";

import RankingAvatar from "@/pages/FtsoRewards/components/RankingAvatar";
import StatusBadge from "@/pages/DefiProtocols/components/shared/StatusBadge";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import InfoHint from "@/components/common/InfoHint";
import { getFlarescanAddressUrl } from "@/config/web3Config";

const SORT_OPTIONS = ["free_capacity", "fee", "minted", "collateral_ratio"];

// Same small pill/segmented control ActivityToolbar hand-rolls for its own
// date-range and sort toggles — not extracted into a shared component
// anywhere in this codebase yet, so this mirrors it locally rather than
// inventing a different control (a <select>, a dropdown) for what's
// already an established, recognizable pattern.
function Segmented({ options, value, onChange, getLabel, disabled = false }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1 flex-wrap">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            value === option ? "bg-brand text-white" : "text-ink-secondary hover:text-ink-primary"
          }`}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

function formatFxrp(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// `minting_vault_collateral_ratio_min`/`minting_pool_collateral_ratio_min`
// are real, live, per-agent fields (the required minimum for each ratio) —
// appended defensively (only when the field is actually present) rather
// than assumed always-present, since the exact same live agent list
// response is what drove building the ratio display in the first place;
// a future response missing this field should still render the plain
// ratio rather than a broken interpolation.
function formatRatioWithMin(ratio, min, t) {
  const base = ratio.toFixed(2);
  return min == null ? base : `${base} · ${t("fassets.agents.collateralRatioMin", { value: min.toFixed(1) })}`;
}

function formatPoolRatio(poolRatio, poolMin, t) {
  const value = formatRatioWithMin(poolRatio, poolMin, t);
  return t("fassets.agents.poolRatio", { value });
}

function ExplorerLink({ address, label }) {
  return (
    <a
      href={getFlarescanAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="inline-flex items-center justify-center rounded-lg p-1 text-ink-muted hover:text-brand hover:bg-surface-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
    >
      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
      <span className="sr-only">{label}</span>
    </a>
  );
}

// `name`/`description` are agent-supplied, unverified text set via an
// on-chain registry — not reviewed by FlareGPT or Flare, and the REST
// endpoint (unlike the chat-tool version of this data) doesn't strip
// anything. Rendered as plain JSX text only (React already never
// interprets this as HTML — no dangerouslySetInnerHTML, no markdown
// renderer, nothing that could turn either field into markup or, if this
// data is ever piped into an AI context elsewhere, into an instruction).
// `icon_url` (also agent-supplied) IS used, via RankingAvatar's own
// `logoSrc` prop — a plain `<img src>` load, not markup/script execution,
// and RankingAvatar already falls back to the initials circle on a missing
// URL or a real load failure (`onError`), which is the "existing dashboard
// pattern" this reuses rather than inventing a new fallback.
//
// That fallback is also what silently masked a real bug for a while: the
// live agents endpoint's `icon_url` values point to real, working images
// (confirmed live, 200 + correct content-type), but vercel.json's own
// Content-Security-Policy `img-src` directive didn't list the hosts they
// actually come from — every load was blocked by the browser itself
// (confirmed by replaying the real production CSP header, which the local
// dev/e2e static server never applies, so this never showed up in that
// testing loop), silently falling back to initials instead of erroring
// visibly. `https://raw.githubusercontent.com` (the same TowoLabs
// FTSO-signal-providers CDN ProviderRankingCard.jsx's own bundled
// PROVIDER_LOGOS already trusts) is now allowlisted in vercel.json,
// covering every agent observed live except one whose `icon_url` points to
// its own company domain instead — that one still correctly falls back to
// initials rather than the CSP being loosened to an unbounded wildcard for
// whatever host any future agent's registry entry happens to point to.
// Every field the desktop table shows is still here — nothing dropped for
// mobile — just laid out with more breathing room than the original tight
// 2-column grid: a real divider separates identity from the numbers, the
// numbers themselves get a clearer label/value type contrast (uppercase
// micro-labels over larger tabular-nums values, matching the desktop
// header treatment), and a second divider sets the status badges apart as
// their own row instead of crowding directly under the grid.
function AgentRow({ agent, t }) {
  return (
    <div className="rounded-xl bg-surface-inset p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <RankingAvatar name={agent.name} logoSrc={agent.icon_url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-primary">{agent.name}</p>
            {agent.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{agent.description}</p>
            )}
          </div>
        </div>
        <ExplorerLink address={agent.vault_address} label={t("fassets.agents.viewOnExplorer")} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {t("fassets.agents.columns.fee")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-semibold text-ink-primary">{agent.fee_pct}%</p>
          {!!agent.pool_fee_share_pct && (
            <p className="tabular-nums text-[10px] text-ink-muted">
              {t("fassets.agents.poolFeeShare", { value: agent.pool_fee_share_pct })}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {t("fassets.agents.columns.freeCapacity")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-semibold text-ink-primary">
            {formatFxrp(agent.free_capacity_fxrp)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {t("fassets.agents.columns.minted")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-semibold text-ink-primary">
            {formatFxrp(agent.minted_fxrp)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {t("fassets.agents.columns.collateralRatio")}
          </p>
          <p className="mt-0.5 tabular-nums text-sm font-semibold text-ink-primary">
            {formatRatioWithMin(agent.vault_collateral_ratio, agent.minting_vault_collateral_ratio_min, t)}
          </p>
          {agent.pool_collateral_ratio != null && (
            <p className="tabular-nums text-[10px] text-ink-muted">
              {formatPoolRatio(agent.pool_collateral_ratio, agent.minting_pool_collateral_ratio_min, t)}
            </p>
          )}
        </div>
      </div>

      {(agent.in_liquidation || !agent.publicly_available) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-divider pt-3">
          {agent.in_liquidation && (
            <StatusBadge label={t("fassets.agents.inLiquidation")} tone="neutral" />
          )}
          {!agent.publicly_available && (
            <StatusBadge label={t("fassets.agents.notPubliclyAvailable")} tone="neutral" />
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-2.5 w-28 rounded" />
        <div className="skeleton h-2 w-40 rounded" />
      </div>
      <div className="skeleton h-2.5 w-12 rounded" />
    </div>
  );
}

// Hand-rolled rather than GenericTable (needs a real explorer <a> cell,
// StatusBadge cells, and an avatar/description combo none of GenericTable's
// auto-derived-column machinery supports) and rather than RankingCardShell
// (built for a 2-numbers-per-row leaderboard; agents have four genuinely
// comparable numeric columns — fee, free capacity, minted, collateral
// ratio — which reads better as a real table). Mobile: stacked cards
// (AgentRow, reused for both — the desktop table below is a distinct
// second layout, not the same markup resized), matching the established
// "table becomes a card list below sm" convention already used by
// GovernanceHistoryTable.jsx/FirePoolsTable.jsx.
export default function AgentsTable({
  agents,
  sort,
  onSortChange,
  isLoading,
  isError,
  isFetching,
  onRetry,
}) {
  const { t } = useTranslation();
  // True only while switching sort with existing rows already on screen
  // (see useFassetsAgents' `placeholderData: keepPreviousData`) — the
  // initial load still goes through the `isLoading` skeleton branch below,
  // never this one, so the two never fire at the same time.
  const isRefetchingWithData = isFetching && !isLoading && agents.length > 0;

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">{t("fassets.agents.title")}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{t("fassets.agents.subtitle")}</p>
        </div>
        <Segmented
          options={SORT_OPTIONS}
          value={sort}
          onChange={onSortChange}
          getLabel={(o) => t(`fassets.agents.sort.${o}`)}
          disabled={isFetching}
        />
      </div>

      {isLoading ? (
        <div className="mt-4 divide-y divide-divider" role="status">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("fassets.agents.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : agents.length === 0 ? (
        <div className="mt-4">
          <WalletEmptyState
            icon={BuildingLibraryIcon}
            title={t("fassets.agents.emptyTitle")}
            description={t("fassets.agents.emptyDescription")}
          />
        </div>
      ) : (
        // `aria-busy` + a subtle opacity dim while a sort switch is
        // re-fetching over already-visible rows (see isRefetchingWithData
        // above) — communicates "updating" without swapping the DOM
        // structure the way falling back to the skeleton branch would.
        <div aria-busy={isRefetchingWithData} className={isRefetchingWithData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* Mobile: stacked cards, one per agent. Desktop below is the
              real table — two independent layouts, not one resized. */}
          <div className="mt-4 space-y-2.5 sm:hidden">
            {agents.map((agent) => (
              <AgentRow key={agent.vault_address} agent={agent} t={t} />
            ))}
          </div>

          {/* `table-layout: fixed` + a `<colgroup>` — the actual fix for
              switching sort options visibly shifting the table's own column
              widths: with the default `auto` layout, each column's width is
              recomputed from whichever content happens to be present, so a
              different sort bringing a longer name or a wider number to the
              top nudges every column over. Fixed widths make the column
              grid itself independent of which rows are currently shown.
              Status is the one column whose real content (an occasional
              badge or two, always the explorer-link icon) never needs much
              room — it used to be split across two columns (a 12%-wide
              "Status" column that's empty most of the time, plus a separate
              6%-wide icon-only column with an sr-only header), which both
              wasted width and left the header row looking incomplete above
              the icon. Merged into one right-aligned column sized to what
              it actually holds, with the freed-up width going to Collateral
              Ratio (18% -> 20%), the column with the densest per-cell
              content (two stacked ratio + minimum lines). */}
          <div className="mt-4 hidden overflow-x-auto sm:block scrollbar-none">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-divider">
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("fassets.agents.columns.agent")}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {t("fassets.agents.columns.fee")}
                      <InfoHint label={t("fassets.agents.columns.fee")} align="right">
                        {t("fassets.agents.feeHelp")}
                      </InfoHint>
                    </span>
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {t("fassets.agents.columns.freeCapacity")}
                      <InfoHint label={t("fassets.agents.columns.freeCapacity")} align="right">
                        {t("fassets.agents.freeCapacityHelp")}
                      </InfoHint>
                    </span>
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("fassets.agents.columns.minted")}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {t("fassets.agents.columns.collateralRatio")}
                      <InfoHint label={t("fassets.agents.columns.collateralRatio")} align="right">
                        {t("fassets.agents.collateralRatioHelp")}
                      </InfoHint>
                    </span>
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap">
                    {t("fassets.agents.columns.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {agents.map((agent) => (
                  <tr key={agent.vault_address}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RankingAvatar name={agent.name} logoSrc={agent.icon_url} size={28} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-primary" title={agent.name}>
                            {agent.name}
                          </p>
                          {agent.description && (
                            <p className="truncate text-[11px] text-ink-muted" title={agent.description}>
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-primary">
                      {agent.fee_pct}%
                      {!!agent.pool_fee_share_pct && (
                        <p className="text-[10px] text-ink-muted">
                          {t("fassets.agents.poolFeeShare", { value: agent.pool_fee_share_pct })}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-primary">
                      {formatFxrp(agent.free_capacity_fxrp)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-primary">
                      {formatFxrp(agent.minted_fxrp)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink-primary">
                      {formatRatioWithMin(agent.vault_collateral_ratio, agent.minting_vault_collateral_ratio_min, t)}
                      {agent.pool_collateral_ratio != null && (
                        <p className="text-[10px] text-ink-muted">
                          {formatPoolRatio(agent.pool_collateral_ratio, agent.minting_pool_collateral_ratio_min, t)}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {agent.in_liquidation && (
                          <StatusBadge label={t("fassets.agents.inLiquidation")} tone="neutral" />
                        )}
                        {!agent.publicly_available && (
                          <StatusBadge label={t("fassets.agents.notPubliclyAvailable")} tone="neutral" />
                        )}
                        <ExplorerLink
                          address={agent.vault_address}
                          label={t("fassets.agents.viewOnExplorer")}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
