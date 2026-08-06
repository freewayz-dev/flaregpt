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
import type { SceptreVaultResponse } from "@/services/defiProtocolsService";
import type { DetailComponentProps } from "@/pages/DefiProtocols/protocols";

function parsePercent(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export default function SceptreDetail({
  data,
  isLoading,
  isError,
  isFetching,
  refetch,
  activeAddress,
  icon: Icon,
}: DetailComponentProps<SceptreVaultResponse>) {
  const { t } = useTranslation();
  const hasData = Boolean(data?.global_kpis && data?.user_position);

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
          {t("defiProtocols.sceptre.couldntLoad")}
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

  // `hasData` above already proves `global_kpis`/`user_position` are
  // present — TS can't trace that through a separately-computed boolean,
  // so this is the one point that narrows `data` back to non-null for the
  // rest of this component.
  const vault = data!;
  const exchangeRate = vault.global_kpis.sflr_to_flr_exchange_rate ?? 1;
  const balance = vault.user_position.sflr_shares_balance ?? 0;
  const redeemable = vault.user_position.redeemable_value_flr ?? 0;
  const ownershipPct = parsePercent(vault.user_position.pool_ownership);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-10 xl:items-start">
      <div className="min-w-0 max-w-xl">
        <div className="flex items-baseline gap-2">
          <TokenIcon symbol="SFLR" size={18} />
          <p className="text-3xl font-bold text-ink-primary">
            {formatAmount(exchangeRate, 6)}
          </p>
          <p className="text-sm text-ink-muted">
            {t("defiProtocols.sceptre.exchangeRateLabel")}
          </p>
          {exchangeRate >= 1 && (
            <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
        </div>

        <div className="mt-4 divide-y divide-divider">
          <TokenRow
            symbol="SFLR"
            label={t("defiProtocols.common.yourBalance")}
            value={<SensitiveValue>{`${formatAmount(balance)} sFLR`}</SensitiveValue>}
            highlight={balance > 0}
          />
          <TokenRow
            symbol="FLR"
            label={t("defiProtocols.common.redeemableValue")}
            value={<SensitiveValue>{`${formatAmount(redeemable)} FLR`}</SensitiveValue>}
            highlight={redeemable > 0}
          />
        </div>

        <div className="mt-5">
          <PoolOwnershipBar
            label={t("defiProtocols.common.poolOwnership")}
            percentage={ownershipPct}
            valueLabel={vault.user_position.pool_ownership}
          />
        </div>
      </div>

      {/* At xl+ this becomes its own column alongside the position summary
          instead of one more thing stacked below it — the extra width a
          wide viewport gives this panel goes toward showing more at once,
          not toward a longer single column. */}
      <div className="mt-5 border-t border-divider pt-4 xl:mt-0 xl:border-t-0 xl:pt-0">
        <Disclosure
          label={t("defiProtocols.common.protocolDetails")}
          bordered={false}
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <MetricTile
              icon={(props) => <TokenIcon symbol="SFLR" size={14} {...props} />}
              label={t("defiProtocols.sceptre.totalMinted")}
              value={formatAmount(vault.global_kpis.total_minted_shares, 0)}
            />
            <MetricTile
              icon={(props) => <TokenIcon symbol="FLR" size={14} {...props} />}
              label={t("defiProtocols.sceptre.backedFlr")}
              value={formatAmount(vault.global_kpis.underlying_backed_flr, 0)}
            />
          </div>
          <AddressPill
            label={t("defiProtocols.common.proxyContract")}
            address={vault.proxy_address}
          />
        </Disclosure>
      </div>
    </div>
  );
}
