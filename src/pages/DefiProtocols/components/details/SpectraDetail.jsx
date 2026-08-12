import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useUIStore} from "@/store/useUIStore";
import { useSpectraVault } from "@/hooks/queries/useDefiProtocolsQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import MetricTile from "@/pages/DefiProtocols/components/shared/MetricTile";
import AddressPill from "@/pages/DefiProtocols/components/shared/AddressPill";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import TokenIcon from "@/components/common/TokenIcon";
import TokenRow from "@/components/common/TokenRow";
import SensitiveValue from "@/components/common/SensitiveValue";
import DetailSkeleton from "@/pages/DefiProtocols/components/skeletons/DetailSkeleton";
import { formatAmount } from "@/utils/format";



// Human-readable labels for the two markets the API supports — the slugs
// themselves (`stxrp-2026-08-27`) are what's actually sent, this is display
// only. Adding a third market later means adding one entry here (this list
// drives the selector) and nowhere else, same "registry, not scattered
// conditionals" spirit as protocols.jsx itself.
const MARKETS = [
  { slug: "stxrp-2026-08-27", label: "Aug 2026" },
  { slug: "stxrp-2027-03-31", label: "Mar 2027" },
];

function formatMaturityDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Spectra is the only protocol in this registry with more than one market
// to choose from (see protocols.jsx, which only knows how to preview a
// single default market in the list row) — so unlike every sibling detail
// component here, this one manages its own fetch against the *shared*
// persisted `spectraMarket` preference (see useUIStore) rather than only
// reading the `data`/`isLoading`/etc props ProtocolExplorer passes down.
// Both that generic preview query and this one read the same store value,
// so they resolve to the exact same query key and share one cached
// request — picking a market here updates the list row's preview too, not
// just this panel, with no extra fetch either way.
//
// The global market data (maturity, supply) is deliberately shown
// regardless of wallet connection — confirmed live that the backend
// returns it either way — only the user's own position is gated behind
// having a wallet selected, unlike Firelight/Sceptre/MXRPY, whose APIs
// have nothing meaningful to show without one.
export default function SpectraDetail({
  activeAddress,
  icon: Icon,
}) {
  const { t } = useTranslation();
  const spectraMarket = useUIStore((s) => s.spectraMarket);
  const setSpectraMarket = useUIStore((s) => s.setSpectraMarket);

  const { data, isLoading, isError, isFetching, refetch } = useSpectraVault(
    activeAddress,
    spectraMarket,
  );
  const market = data?.markets?.[0];
  const hasData = Boolean(market?.global_analytics);
  const position = market?.user_position;

  return (
    <div>
      <div className="mb-5 flex w-fit items-center gap-1 self-start rounded-lg bg-surface-inset p-1">
        {MARKETS.map((m) => (
          <button
            key={m.slug}
            type="button"
            onClick={() => setSpectraMarket(m.slug)}
            aria-current={spectraMarket === m.slug ? "true" : undefined}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              spectraMarket === m.slug
                ? "bg-brand text-white"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!isError && (isLoading || !hasData) ? (
        <DetailSkeleton />
      ) : isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink-primary">
            {t("defiProtocols.spectra.couldntLoad")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("dashboard.common.networkHiccup")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching
              ? t("dashboard.common.retrying")
              : t("dashboard.common.retry")}
          </button>
        </div>
      ) : !market ? (
        <WalletEmptyState
          icon={Icon}
          title={t("defiProtocols.spectra.noData.title")}
          description={t("defiProtocols.spectra.noData.description")}
        />
      ) : (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-10 xl:items-start">
          <div className="min-w-0 max-w-xl">
            <div className="flex items-baseline gap-2">
              <TokenIcon symbol="STXRP" size={18} />
              {market.matured ? (
                <p className="text-3xl font-bold text-ink-primary">
                  {t("defiProtocols.spectra.matured")}
                </p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-ink-primary">
                    {Math.max(0, Math.round(market.days_to_maturity))}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {t("defiProtocols.spectra.daysToMaturity")}
                  </p>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {t("defiProtocols.spectra.maturesOn", {
                date: formatMaturityDate(market.maturity_date),
              })}
            </p>

            {!activeAddress ? (
              <div className="mt-4">
                <WalletEmptyState
                  icon={Icon}
                  title={t("dashboard.common.noWalletSelected")}
                  description={t("defiProtocols.common.connectToSeePosition")}
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-divider">
                <TokenRow
                  symbol="STXRP"
                  label={t("defiProtocols.spectra.ptBalance")}
                  value={
                    <SensitiveValue>{`${formatAmount(position?.pt_balance ?? 0)} PT`}</SensitiveValue>
                  }
                  highlight={(position?.pt_balance ?? 0) > 0}
                />
                <TokenRow
                  symbol="STXRP"
                  label={t("defiProtocols.spectra.ytBalance")}
                  value={
                    <SensitiveValue>{`${formatAmount(position?.yt_balance ?? 0)} YT`}</SensitiveValue>
                  }
                  highlight={(position?.yt_balance ?? 0) > 0}
                />
                <TokenRow
                  symbol="STXRP"
                  label={t("defiProtocols.spectra.redeemableAtMaturity")}
                  value={
                    <SensitiveValue>{`${formatAmount(position?.redeemable_underlying_at_maturity ?? 0)} stXRP`}</SensitiveValue>
                  }
                  highlight={(position?.redeemable_underlying_at_maturity ?? 0) > 0}
                />
                <TokenRow
                  symbol="STXRP"
                  label={t("defiProtocols.spectra.claimableYield")}
                  value={
                    <SensitiveValue>{`${formatAmount(position?.claimable_yield_ibt ?? 0)} stXRP`}</SensitiveValue>
                  }
                  highlight={(position?.claimable_yield_ibt ?? 0) > 0}
                />
              </div>
            )}
          </div>

          {/* At xl+ this becomes its own column alongside the position
              summary instead of one more thing stacked below it. */}
          <div className="mt-5 border-t border-divider pt-4 xl:mt-0 xl:border-t-0 xl:pt-0">
            <Disclosure
              label={t("defiProtocols.common.protocolDetails")}
              bordered={false}
            >
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                <MetricTile
                  icon={(props) => <TokenIcon symbol="STXRP" size={14} {...props} />}
                  label={t("defiProtocols.spectra.ptCirculatingSupply")}
                  value={formatAmount(market.global_analytics.pt_circulating_supply, 0)}
                  caption={market.pt_symbol}
                />
                <MetricTile
                  icon={(props) => <TokenIcon symbol="STXRP" size={14} {...props} />}
                  label={t("defiProtocols.spectra.ibtLocked")}
                  value={formatAmount(market.global_analytics.ibt_locked, 0)}
                  caption="stXRP"
                />
              </div>
              <AddressPill
                label={t("defiProtocols.spectra.ptContract")}
                address={market.pt_contract}
              />
              <AddressPill
                label={t("defiProtocols.spectra.ytContract")}
                address={market.yt_contract}
              />
              <AddressPill
                label={t("defiProtocols.spectra.ibtContract")}
                address={market.ibt_contract}
              />
            </Disclosure>
          </div>
        </div>
      )}
    </div>
  );
}
