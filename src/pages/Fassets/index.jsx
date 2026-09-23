import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import { useFassetsOverview, useFassetsAgents } from "@/hooks/queries/useFassetsQueries";
import { computeFlowTrend, computePendingRedemptions } from "@/pages/Fassets/utils/deriveFassetsOverview";
import FassetsSkeleton from "@/pages/Fassets/components/FassetsSkeleton";
import FassetsStatsRow from "@/pages/Fassets/components/FassetsStatsRow";
import FassetsFlowCard from "@/pages/Fassets/components/FassetsFlowCard";
import FassetsTrendChart from "@/pages/Fassets/components/FassetsTrendChart";
import AgentsTable from "@/pages/Fassets/components/AgentsTable";
import MyFxrpSection from "@/pages/Fassets/components/MyFxrpSection";

const DEFAULT_SORT = "free_capacity";

// Flare's own official FAssets page, confirmed live (200) and fetched
// directly rather than assumed — it explicitly lists several independent,
// third-party minting dApps ("mint FAssets on your preferred dApp") rather
// than naming one canonical destination, two of which are run by agent
// operators already listed in this page's own AgentsTable (AU,
// Oracle-daemon). Linking to any single one of those instead of this page
// would read as this app endorsing that specific agent over the others in
// its own table — exactly what the agent-ranking `rank` rule elsewhere on
// this page already guards against. This neutral overview page is the
// correct destination for that same reason, not a runner-up choice.
const FASSETS_INFO_URL = "https://flare.network/products/fassets";

// Public, no-auth, no-wallet-gating page — modeled directly on Fire/
// index.jsx (itself modeled on Links/index.jsx): PageHeader -> loading
// skeleton -> error+retry -> content, no wallet-connect gate anywhere.
// `MyFxrpSection` is the one exception, and it gates *itself*
// independently (same established pattern as FTSO Rewards' own
// YourValidatorStakeCard) rather than the whole page gating on a wallet.
//
// `overview` (proof_of_reserve/flow_24h/trend_daily) is FlareMetrics-only
// and null on the on-chain-fallback response — every section built from
// those fields is simply omitted rather than shown empty/greyed, the same
// "degraded means a section silently doesn't render" idiom Fire's own v2
// trend chart already established (see fireService.js's own comment on the
// source/degraded contract). There's deliberately no visible "degraded" or
// "fallback" badge anywhere on this page, matching that precedent and the
// standing rule against reintroducing a global "showing cached/partial
// data" banner.
export default function Fassets() {
  const { t } = useTranslation();
  const overviewQuery = useFassetsOverview();
  const overview = overviewQuery.data;

  // Agents fetch independently of the overview query above and owns its
  // own loading/error state inside AgentsTable — a slow or failed agents
  // fetch is not a page-level failure, same reasoning Fire's v1/v2 split
  // uses for its own trend chart.
  const [sort, setSort] = useState(DEFAULT_SORT);
  const agentsQuery = useFassetsAgents(sort);

  const trendSeries = computeFlowTrend(overview?.trend_daily);
  const pendingRedemptions = computePendingRedemptions(agentsQuery.data?.agents);

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.fassets")}
          description={t("fassets.description")}
          rightContent={
            // Direct in-app minting/redemption isn't supported (needs an
            // XRPL wallet connection and a cross-chain reservation/proof
            // flow this app has no infrastructure for at all) — this is a
            // clearly external link, not a button implying an in-app
            // action, same treatment as FTSO Rewards' own "Stake FLR" CTA
            // to portal.flare.network for the identical reason.
            <a
              href={FASSETS_INFO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer"
            >
              {t("fassets.mintRedeemCta")}
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          }
        />
        {/* Fixed, plain-language copy rather than the API's own raw `note`
            field — that field is real and accurate but written for an
            engineer (decimal counts, field names like minted_lots_pct/
            core_vault_supply_is_derived), not a dashboard visitor. Same
            Disclosure component, placement, and props as Fire's own "What
            is FIRE?" explainer (collapsed by default, `align="start"` for
            the brand-colored clickable label, `bordered={false}` since
            there's nothing above it on this page for a rule to actually
            separate) — shown unconditionally right under the header,
            matching Fire exactly, rather than gated behind the data load
            below. No FlareMetrics attribution line here — see this page's
            own comment further down on why. */}
        <Disclosure label={t("fassets.info.label")} align="start" bordered={false}>
          <p className="text-xs text-ink-secondary max-w-2xl">{t("fassets.info.body")}</p>
        </Disclosure>
      </div>

      {overviewQuery.isLoading ? (
        <FassetsSkeleton />
      ) : overviewQuery.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("fassets.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
            {overviewQuery.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : (
        <>
          <FassetsStatsRow
            supply={overview.supply}
            agents={overview.agents}
            proofOfReserve={overview.proof_of_reserve}
            holders={overview.holders}
          />

          {/* No FlareMetrics attribution line here — the info Disclosure
              above (in the header block) already covers the "where this
              data comes from" caveat in plain language, and this page
              deliberately never names the third-party source directly. */}

          {(overview.flow_24h || overview.limits || pendingRedemptions != null) && (
            <FassetsFlowCard
              flow={overview.flow_24h}
              limits={overview.limits}
              pendingRedemptions={pendingRedemptions}
            />
          )}

          {trendSeries.length > 0 && <FassetsTrendChart series={trendSeries} />}

          <AgentsTable
            agents={agentsQuery.data?.agents ?? []}
            sort={sort}
            onSortChange={setSort}
            isLoading={agentsQuery.isLoading}
            isError={agentsQuery.isError}
            isFetching={agentsQuery.isFetching}
            onRetry={() => agentsQuery.refetch()}
          />

          {/* Personal, wallet-scoped — deliberately last: every section
              above is public, network-wide data (ecosystem stats, 24h
              flow/trend, the full agent list) that's useful with no wallet
              at all, same "public content first, personal content last"
              ordering FTSO Rewards already uses for its own
              YourValidatorStakeCard. Agent Vaults in particular belongs
              ahead of this — it's the detailed, page-defining content the
              stats/flow numbers above are summarizing, while "my own
              balance and activity" is a narrower, secondary view most
              visitors (no wallet connected) never see at all. */}
          <MyFxrpSection />
        </>
      )}
    </div>
  );
}
