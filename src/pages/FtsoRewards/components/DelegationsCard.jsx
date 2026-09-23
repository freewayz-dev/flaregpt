import { useTranslation } from "react-i18next";
import { UserGroupIcon } from "@heroicons/react/24/outline";

import InfoHint from "@/components/common/InfoHint";
import DelegationsList from "@/pages/FtsoRewards/components/DelegationsList";

// Sorted by weight already (see computeDelegationRows) so the largest
// allocation always reads first, regardless of what order the API itself
// returns them in.
export default function DelegationsCard({ delegations }) {
  const { t } = useTranslation();

  return (
    <div className="h-full rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <h3 className="text-sm font-semibold text-ink-primary">
            {t("ftsoRewards.delegations.title")}
          </h3>
          <InfoHint label={t("ftsoRewards.delegations.help.label")}>
            {t("ftsoRewards.delegations.help.body")}
          </InfoHint>
        </span>
        {delegations.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted shrink-0">
            {t("ftsoRewards.delegations.count", { count: delegations.length })}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <DelegationsList
          delegations={delegations}
          emptyIcon={UserGroupIcon}
          emptyTitle={t("ftsoRewards.delegations.emptyTitle")}
          emptyDescription={t("ftsoRewards.delegations.emptyDescription")}
        />
      </div>
    </div>
  );
}
