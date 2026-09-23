import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useNavigate } from "react-router";
import { WalletIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import { useDerivedWalletHub } from "@/store/useWalletHubStore";
import { useWalletBalances } from "@/hooks/queries/useDashboardQueries";
import { useWalletActivity } from "@/hooks/queries/useWalletActivityQueries";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import SensitiveValue from "@/components/common/SensitiveValue";
import TransactionRow from "@/pages/WalletActivity/components/TransactionRow";
import FassetsTransactionDrawer from "@/pages/Fassets/components/FassetsTransactionDrawer";
import { withActionIds } from "@/pages/WalletActivity/utils/deriveActivity";
import { formatAmount } from "@/utils/format";
import { ROUTES } from "@/config/routes";

// Raised from an earlier 5-item cap now that the list itself scrolls
// internally (see the `max-h-72 overflow-y-auto` container below) — a
// fixed-height scrollable container can comfortably hold more rows than it
// shows at once, so there's no reason to throw away real recent history
// just to keep the section short; "View all in Wallet Activity" below it
// still covers anything beyond this.
const RECENT_LIMIT = 15;

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-2.5 w-24 rounded" />
        <div className="skeleton h-2 w-16 rounded" />
      </div>
      <div className="skeleton h-2.5 w-14 rounded" />
    </div>
  );
}

// Wallet-gated sub-section on an otherwise fully public page — same
// established pattern as FTSO Rewards' own YourValidatorStakeCard: the
// rest of this page works with no wallet at all, this one card gates
// itself independently rather than the whole page gating on activeAddress.
//
// Reuses the exact same balances/activity data and row component the rest
// of the dashboard already fetches and renders (useWalletBalances,
// useWalletActivity, TransactionRow) — "My FXRP" is a filtered view of
// data those already own, not a second implementation of either.
export default function MyFxrpSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address: connectedAddress, isConnected } = useConnection();
  const { activeAddress } = useDerivedWalletHub(connectedAddress, isConnected);

  const balancesQuery = useWalletBalances(activeAddress);
  const activityQuery = useWalletActivity(activeAddress);

  // Matched by `action_tag` PREFIX, not a hardcoded list of specific tags —
  // confirmed live that FXRP_MINT and FXRP_TRANSFER are both real, already-
  // returned tags; a prefix match means FXRP_REDEEM (and anything else the
  // backend adds under this same prefix later, e.g. FXRP_MINT_RESERVE)
  // shows up automatically too, rather than silently being excluded
  // because it wasn't on a list written before it was ever observed live.
  // `asset === "FXRP"` is kept alongside the tag check as a safety net for
  // an entry whose tag doesn't happen to start with FXRP_ but whose asset
  // still is one (matches every other asset-based filter in this app).
  const fxrpActivity = useMemo(() => {
    const history = activityQuery.data?.history;
    if (!history?.length) return [];
    return withActionIds(history)
      .filter(
        (item) => item.asset === "FXRP" || (item.action_tag ?? "").toUpperCase().startsWith("FXRP"),
      )
      .slice(0, RECENT_LIMIT);
  }, [activityQuery.data]);

  const balance = balancesQuery.data?.balances?.FXRP;

  // Opens a real detail panel in place instead of navigating to Wallet
  // Activity (what this used to do via `navigate(...?tx=...)`) — clicking
  // a row here previously took the user away from FAssets entirely just to
  // see what they'd just clicked. Local, index-based state (not a `?tx=`
  // search param the way Wallet Activity's own drawer uses) is enough:
  // opening/closing a portal-rendered overlay never touches this page's
  // own scroll position or unmounts anything, so "return to the exact same
  // page state" is already true for free, with no URL round-trip needed.
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const selectedItem = selectedIndex >= 0 ? fxrpActivity[selectedIndex] : null;
  const openTransaction = (actionId) => {
    setSelectedIndex(fxrpActivity.findIndex((item) => item.actionId === actionId));
  };
  const stepTransaction = (delta) => {
    const next = selectedIndex + delta;
    if (next >= 0 && next < fxrpActivity.length) setSelectedIndex(next);
  };

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <h3 className="text-sm font-semibold text-ink-primary">{t("fassets.myFxrp.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("fassets.myFxrp.subtitle")}</p>

      {!activeAddress ? (
        <div className="mt-4">
          <WalletEmptyState
            icon={WalletIcon}
            title={t("dashboard.common.noWalletSelected")}
            description={t("fassets.myFxrp.connectToSee")}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-surface-inset p-3">
            <p className="text-xs text-ink-muted">{t("fassets.myFxrp.balance")}</p>
            {balancesQuery.isLoading ? (
              <div className="skeleton mt-1.5 h-6 w-32 rounded" />
            ) : balancesQuery.isError ? (
              <p className="mt-1 text-xs text-ink-muted">{t("fassets.myFxrp.balanceUnavailable")}</p>
            ) : (
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink-primary">
                <SensitiveValue>{formatAmount(balance ?? 0)}</SensitiveValue> FXRP
              </p>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-ink-secondary">
              {t("fassets.myFxrp.recentActivity")}
            </p>

            {/* One consistent bordered shell for every state (loading,
                error, empty, and the real list) — matching Wallet
                Activity's own ActivityFeed container (rounded-2xl card,
                internally scrolling body) rather than a free-floating
                message box, so "no activity yet" still reads as "this is
                the (currently empty) activity table" instead of a
                different, disconnected element. Only the loaded-list body
                actually scrolls (`max-h-72 overflow-y-auto`) — the other
                three states are short enough to never need it, and forcing
                a scroll region around a single centered message would just
                add empty space. */}
            <div className="rounded-xl border border-divider overflow-hidden">
              {activityQuery.isLoading ? (
                <div className="divide-y divide-divider">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : activityQuery.isError ? (
                <div role="alert" className="px-4 py-6 text-center">
                  <p className="text-xs font-medium text-ink-primary">
                    {t("fassets.myFxrp.activityCouldntLoad")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
                  <button
                    type="button"
                    onClick={() => activityQuery.refetch()}
                    disabled={activityQuery.isFetching}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${activityQuery.isFetching ? "animate-spin" : ""}`} />
                    {activityQuery.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
                  </button>
                </div>
              ) : fxrpActivity.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-ink-muted">{t("fassets.myFxrp.noActivity")}</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto scrollbar-none divide-y divide-divider">
                  {fxrpActivity.map((item) => (
                    <TransactionRow key={item.actionId} item={item} compact onSelect={openTransaction} />
                  ))}
                </div>
              )}
            </div>

            {fxrpActivity.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(ROUTES.walletActivity)}
                className="mt-2 text-xs font-medium text-brand hover:text-brand-hover transition-colors cursor-pointer"
              >
                {t("fassets.myFxrp.viewAllInWalletActivity")}
              </button>
            )}
          </div>

          <FassetsTransactionDrawer
            item={selectedItem}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < fxrpActivity.length - 1}
            onPrev={() => stepTransaction(-1)}
            onNext={() => stepTransaction(1)}
            onClose={() => setSelectedIndex(-1)}
          />
        </>
      )}
    </div>
  );
}
