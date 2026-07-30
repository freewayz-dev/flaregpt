import { useTranslation } from "react-i18next";
import { UserGroupIcon } from "@heroicons/react/24/outline";

import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";

function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Sorted by weight already (see computeDelegationRows) so the largest
// allocation always reads first, regardless of what order the API itself
// returns them in.
export default function DelegationsCard({ delegations }) {
  const { t } = useTranslation();

  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-primary">
          {t("ftsoRewards.delegations.title")}
        </h3>
        {delegations.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted shrink-0">
            {t("ftsoRewards.delegations.count", { count: delegations.length })}
          </span>
        )}
      </div>

      {!delegations.length ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <WalletEmptyState
            icon={UserGroupIcon}
            title={t("ftsoRewards.delegations.emptyTitle")}
            description={t("ftsoRewards.delegations.emptyDescription")}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {delegations.map((d) => (
            <div key={d.address}>
              <PoolOwnershipBar
                label={d.name ?? truncateAddress(d.address)}
                percentage={d.weightPercent}
                valueLabel={d.weightLabel}
              />
              {/* Only shown alongside a name — when there's no name, the
                  truncated address is already doing double duty as the
                  bar's own label above, so repeating it here would just
                  be the same text twice. */}
              {d.name && (
                <p className="mt-1 text-[10px] text-ink-muted font-mono">
                  {truncateAddress(d.address)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
