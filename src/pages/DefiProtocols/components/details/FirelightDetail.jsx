import { useTranslation } from "react-i18next";
import { ArrowPathIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import MetricTile from "@/pages/DefiProtocols/components/shared/MetricTile";
import AddressPill from "@/pages/DefiProtocols/components/shared/AddressPill";
import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import TokenIcon from "@/components/common/TokenIcon";
import TokenRow from "@/components/common/TokenRow";
import SensitiveValue from "@/components/common/SensitiveValue";
import DetailSkeleton from "@/pages/DefiProtocols/components/skeletons/DetailSkeleton";
import { formatAmount } from "@/utils/format";

function parsePercent(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export default function FirelightDetail({
  data,
  isLoading,
  isError,
  isFetching,
  refetch,
  activeAddress,
  icon: Icon,
}) {
  const { t } = useTranslation();
  const hasData = Boolean(data?.global_analytics && data?.user_portfolio);

  if (!activeAddress) {
    return (
      <WalletEmptyState
        icon={Icon}
        title={t("dashboard.common.noWalletSelected")}
        description={t("defiProtocols.common.connectToSeePosition")}
      />
    );
  }

  if (!isError && (isLoading || !hasData)) {
    return <DetailSkeleton withBar />;
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-6 text-center">
        <p className="text-sm font-medium text-ink-primary">
          {t("defiProtocols.firelight.couldntLoad")}
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
    );
  }

  const backingMultiplier = data.global_analytics.asset_backing_multiplier ?? 1;
  const balance = data.user_portfolio.stxrp_balance ?? 0;
  const redeemable = data.user_portfolio.redeemable_fxrp_value ?? 0;
  const ownershipPct = parsePercent(data.user_portfolio.pool_ownership);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-10 xl:items-start">
      <div className="min-w-0 max-w-xl">
        <div className="flex items-baseline gap-2">
          <TokenIcon symbol="STXRP" size={18} />
          <p className="text-3xl font-bold text-ink-primary">
            {formatAmount(backingMultiplier, 6)}x
          </p>
          <p className="text-sm text-ink-muted">
            {t("defiProtocols.firelight.backingLabel")}
          </p>
          {backingMultiplier >= 1 && (
            <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
        </div>

        <div className="mt-4 divide-y divide-divider">
          <TokenRow
            symbol="STXRP"
            label={t("defiProtocols.common.yourBalance")}
            value={<SensitiveValue>{`${formatAmount(balance)} ${data.receipt_token}`}</SensitiveValue>}
            highlight={balance > 0}
          />
          <TokenRow
            symbol="FXRP"
            label={t("defiProtocols.common.redeemableValue")}
            value={<SensitiveValue>{`${formatAmount(redeemable)} fXRP`}</SensitiveValue>}
            highlight={redeemable > 0}
          />
        </div>

        <div className="mt-5">
          <PoolOwnershipBar
            label={t("defiProtocols.common.poolOwnership")}
            percentage={ownershipPct}
            valueLabel={data.user_portfolio.pool_ownership}
          />
        </div>
      </div>

      {/* At xl+ this becomes its own column alongside the position summary
          instead of one more thing stacked below it. */}
      <div className="mt-5 border-t border-divider pt-4 xl:mt-0 xl:border-t-0 xl:pt-0">
        <Disclosure
          label={t("defiProtocols.common.protocolDetails")}
          bordered={false}
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <MetricTile
              icon={(props) => <TokenIcon symbol="STXRP" size={14} {...props} />}
              label={t("defiProtocols.firelight.circulatingSupply")}
              value={formatAmount(data.global_analytics.circulating_supply_stxrp, 0)}
              caption={data.receipt_token}
            />
            <MetricTile
              icon={(props) => <TokenIcon symbol="FXRP" size={14} {...props} />}
              label={t("defiProtocols.firelight.underlyingReserve")}
              value={formatAmount(data.global_analytics.underlying_reserve_fxrp, 0)}
              caption="fXRP"
            />
          </div>
          <AddressPill
            label={t("defiProtocols.common.proxyContract")}
            address={data.proxy_contract}
          />
        </Disclosure>
      </div>
    </div>
  );
}
