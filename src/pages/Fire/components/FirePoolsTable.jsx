import { useTranslation } from "react-i18next";
import { ArrowTopRightOnSquareIcon, FireIcon } from "@heroicons/react/24/outline";

import { useCurrency } from "@/hooks/useCurrency";
import { getFlarescanAddressUrl } from "@/config/web3Config";

function formatBalance(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ExplorerLink({ address, label }) {
  if (!address) return null;
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

// Mobile: one card per pool, matching the established "table becomes a
// stacked card list below sm" convention already used by
// GovernanceHistoryTable.jsx/StrategyComparisonTable.jsx — deliberately
// not the old horizontally-scrollable <table>, which forced sideways
// scrolling to reach the value/burned/explorer columns on a narrow
// screen. No literal "Label: value" text pairs, matching both of those
// existing components' own idiom — value is conveyed through position/
// size/color (the USD value is the one bold, largest figure) and the
// FireIcon next to "burned" stands in for a text label the same way
// StrategyMobileCard uses lock icons instead of writing "Liquid"/"Locked".
function PoolMobileCard({ pool, t, formatCurrency }) {
  return (
    <div className="rounded-xl bg-surface-inset p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{pool.label}</p>
          <p className="text-[11px] font-mono text-ink-muted">{pool.token}</p>
        </div>
        <ExplorerLink address={pool.address} label={t("fire.table.viewOnExplorer")} />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold tabular-nums text-ink-primary">
          {formatCurrency(pool.usd_value)}
        </span>
        <span className="text-xs tabular-nums text-ink-secondary">
          {formatBalance(pool.balance)} {pool.token}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
        <FireIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="tabular-nums">
          {pool.burned > 0
            ? `${formatBalance(pool.burned)} ${pool.token} (${formatCurrency(pool.burned_usd)})`
            : formatCurrency(pool.burned_usd)}
        </span>
      </div>
    </div>
  );
}

// Hand-rolled rather than GenericTable — GenericTable derives columns from
// Object.keys() and can only render plain formatted cells, but this needs
// a real <a> explorer-link cell and currency-converted USD formatting,
// neither of which its auto-column machinery supports.
export default function FirePoolsTable({ pools }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {pools.map((pool) => (
          <PoolMobileCard key={pool.id} pool={pool} t={t} formatCurrency={formatCurrency} />
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("fire.table.caption")}</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="text-left font-medium py-2 pr-3">{t("fire.table.category")}</th>
              <th className="text-left font-medium py-2 pr-3">{t("fire.table.token")}</th>
              <th className="text-right font-medium py-2 pr-3">{t("fire.table.balance")}</th>
              <th className="text-right font-medium py-2 pr-3">{t("fire.table.value")}</th>
              <th className="text-right font-medium py-2 pr-3">{t("fire.table.burned")}</th>
              <th className="text-right font-medium py-2">
                <span className="sr-only">{t("fire.table.explorer")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {pools.map((pool) => (
              <tr key={pool.id}>
                <td className="py-2.5 pr-3 text-ink-primary whitespace-nowrap">{pool.label}</td>
                <td className="py-2.5 pr-3 text-ink-secondary font-mono text-xs">{pool.token}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-primary">
                  {formatBalance(pool.balance)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-ink-primary">
                  {formatCurrency(pool.usd_value)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-muted">
                  {pool.burned > 0
                    ? `${formatBalance(pool.burned)} (${formatCurrency(pool.burned_usd)})`
                    : formatCurrency(pool.burned_usd)}
                </td>
                <td className="py-2.5 text-right">
                  <ExplorerLink address={pool.address} label={t("fire.table.viewOnExplorer")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
