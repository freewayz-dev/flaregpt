import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { ClockIcon, Square3Stack3DIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useFtsoPortfolio } from "@/hooks/queries/useDashboardQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import TableCardSkeleton from "@/pages/Dashboard/components/skeletons/TableCardSkeleton";
import ClaimsHistoryCard from "@/pages/Dashboard/components/ClaimsHistoryCard";
import DelegationsBreakdownCard from "@/pages/Dashboard/components/DelegationsBreakdownCard";

// Below the lg breakpoint, Claims History and Delegations Breakdown share a
// single card via tabs instead of stacking as two full cards — both tabs
// read from the same already-fetched useFtsoPortfolio() call, so switching
// tabs is instant (no re-fetch, no loading flash) and never shifts the
// surrounding page layout, only the content area inside this one card.
function MobileTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("claims");
  const { address: connectedAddress, isConnected } = useAccount();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);
  const { data, isLoading, isError, isFetching, refetch } =
    useFtsoPortfolio(activeAddress);

  const isClaimsTab = activeTab === "claims";
  const icon = isClaimsTab ? ClockIcon : Square3Stack3DIcon;

  const TABS = [
    { id: "claims", label: t("dashboard.claimsHistory.title") },
    { id: "delegations", label: t("dashboard.delegationsBreakdown.tabLabel") },
  ];

  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
              activeTab === tab.id
                ? "bg-brand text-white"
                : "bg-surface-inset text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
        {!activeAddress ? (
          <WalletEmptyState
            icon={icon}
            title={t("dashboard.common.noWalletSelected")}
            description={
              isClaimsTab
                ? t("dashboard.claimsHistory.connectToSee")
                : t("dashboard.delegationsBreakdown.connectToSee")
            }
          />
        ) : isError ? (
          <div className="py-6 text-center rounded-2xl bg-surface-inset px-4">
            <p className="text-sm font-medium text-ink-primary">
              {isClaimsTab
                ? t("dashboard.claimsHistory.couldntLoad")
                : t("dashboard.delegationsBreakdown.couldntLoad")}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {t("dashboard.common.networkHiccup")}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
            </button>
          </div>
        ) : isLoading || !data?.unclaimed_epochs_ledger || !data?.active_delegations ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded-lg" />
            ))}
          </div>
        ) : isClaimsTab ? (
          <GenericTable
            items={data.unclaimed_epochs_ledger}
            emptyIcon={ClockIcon}
            emptyTitle={t("dashboard.claimsHistory.emptyTitle")}
            emptyDescription={t("dashboard.claimsHistory.emptyDescription")}
          />
        ) : (
          <GenericTable
            items={data.active_delegations}
            emptyIcon={Square3Stack3DIcon}
            emptyTitle={t("dashboard.delegationsBreakdown.emptyTitle")}
            emptyDescription={t("dashboard.delegationsBreakdown.emptyDescription")}
          />
        )}
      </div>
    </div>
  );
}

export default function ClaimsAndDelegationsSection() {
  return (
    <>
      <MobileTabs />
      <div className="hidden lg:grid gap-5 lg:grid-cols-2">
        <ClaimsHistoryCard />
        <DelegationsBreakdownCard />
      </div>
    </>
  );
}
