import { useTranslation } from "react-i18next";
import { UserGroupIcon, ScaleIcon } from "@heroicons/react/24/outline";

import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import InfoHint from "@/components/common/InfoHint";
import { shortenAddress } from "@/utils/address";
import { CONCENTRATION_BAND_LABEL_KEYS } from "@/pages/FtsoRewards/utils/deriveRankings";




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
                label={d.name ?? shortenAddress(d.address)}
                percentage={d.weightPercent}
                valueLabel={d.weightLabel}
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {/* Only shown alongside a name — when there's no name, the
                    truncated address is already doing double duty as the
                    bar's own label above, so repeating it here would just
                    be the same text twice. */}
                {d.name && (
                  <p className="text-[10px] text-ink-muted font-mono truncate">
                    {shortenAddress(d.address)}
                  </p>
                )}
                {/* A filled pill, not a plain caption — deliberately more
                    visually prominent than the address line beside it, but
                    still a single neutral gray/muted treatment regardless
                    of which band value this is (per the handoff's rule:
                    never a tone/color signal, just more legible metadata).
                    ScaleIcon matches DelegationConcentrationCard's own
                    header icon for the same "concentration" concept
                    elsewhere on this page. */}
                {d.concentrationBand && CONCENTRATION_BAND_LABEL_KEYS[d.concentrationBand] && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-inset px-2 py-0.5 text-[11px] font-semibold text-ink-secondary shrink-0">
                    <ScaleIcon className="h-3 w-3 text-ink-muted" />
                    {/* One plain text run, not a nested span for the rank —
                        flex `gap` is layout-only (adds nothing to
                        textContent), and a nested element sharing the same
                        combined text as its parent would make both match
                        an exact-text query. A single string with a real
                        space keeps exactly one element matching it. */}
                    {t(CONCENTRATION_BAND_LABEL_KEYS[d.concentrationBand])}
                    {d.networkRank != null ? ` · #${d.networkRank}` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
