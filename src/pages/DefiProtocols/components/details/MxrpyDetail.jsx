import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import AddressPill from "@/pages/DefiProtocols/components/shared/AddressPill";
import Disclosure from "@/pages/DefiProtocols/components/shared/Disclosure";
import TokenIcon from "@/components/common/TokenIcon";
import SensitiveValue from "@/components/common/SensitiveValue";
import DetailSkeleton from "@/pages/DefiProtocols/components/skeletons/DetailSkeleton";
import { formatAmount } from "@/utils/format";

// Only ever renders the user's own position + one combined caption line up
// front — circulating shares/decimals/contract address are all real fields
// from the API, but none of them help someone decide anything at a glance,
// so they move behind the "Protocol details" disclosure instead of sitting
// in their own tiles.
export default function MxrpyDetail({
  data,
  isLoading,
  isError,
  isFetching,
  refetch,
  activeAddress,
  icon: Icon,
}) {
  const { t } = useTranslation();
  const hasData = Boolean(data?.global_metrics && data?.user_portfolio);

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
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-surface-inset px-4 py-6 text-center">
        <p className="text-sm font-medium text-ink-primary">
          {t("defiProtocols.mxrpy.couldntLoad")}
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

  const shares = data.user_portfolio.receipt_shares ?? 0;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-10 xl:items-start">
      <div className="min-w-0 max-w-xl">
        <div className="flex items-baseline gap-2">
          <TokenIcon symbol="MXRPY" size={18} />
          <p className="text-3xl font-bold text-ink-primary">
            <SensitiveValue>{formatAmount(shares)}</SensitiveValue>{" "}
            <span className="text-lg font-semibold text-ink-muted">
              {data.token_symbol}
            </span>
          </p>
        </div>
        <p className="mt-1 text-xs text-ink-secondary">
          {t("defiProtocols.mxrpy.yourShares")}
        </p>

        <p className="mt-4 text-xs text-ink-muted">
          {t("defiProtocols.mxrpy.circulatingCaption", {
            shares: formatAmount(data.global_metrics.total_circulating_shares, 0),
            decimals: data.global_metrics.token_decimals,
          })}
        </p>
      </div>

      <div className="mt-5 border-t border-divider pt-4 xl:mt-0 xl:border-t-0 xl:pt-0">
        <Disclosure
          label={t("defiProtocols.common.protocolDetails")}
          bordered={false}
        >
          <AddressPill
            label={t("defiProtocols.common.contract")}
            address={data.contract_proxy}
          />
        </Disclosure>
      </div>
    </div>
  );
}
