import { useTranslation } from "react-i18next";
import { ScaleIcon } from "@heroicons/react/24/outline";

import PoolOwnershipBar from "@/pages/DefiProtocols/components/shared/PoolOwnershipBar";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import { shortenAddress } from "@/utils/address";
import { CONCENTRATION_BAND_LABEL_KEYS } from "@/pages/FtsoRewards/utils/deriveRankings";

// Extracted from DelegationsCard.jsx (FTSO Rewards) so the exact same row
// presentation — a labeled percentage bar plus an address/concentration-
// pill caption line, not a table — can also back Overview's own
// delegations view on mobile (see ClaimsAndDelegationsSection.jsx). Both
// consumers feed it rows shaped by the same `computeDelegationRows`
// (deriveFtsoRewards.js), since both read the identical
// `GET /api/v1/portfolio/ftso/{wallet}` `active_delegations` field — this
// was always the same data, just rendered as a cramped auto-column table
// in one of the two places instead of reusing the presentation already
// built for the other.
export default function DelegationsList({ delegations, emptyIcon, emptyTitle, emptyDescription }) {
  const { t } = useTranslation();

  if (!delegations.length) {
    // `flex-1` only matters inside a `flex flex-col` parent (DelegationsCard
    // — vertically centers the empty state in whatever height the card's
    // sibling rows would otherwise occupy); it's a harmless no-op in a
    // plain block parent (Overview's mobile tab panel).
    return (
      <div className="flex flex-1 items-center justify-center py-4">
        <WalletEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
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
                bar's own label above, so repeating it here would just be
                the same text twice. */}
            {d.name && (
              <p className="text-[10px] text-ink-muted font-mono truncate">
                {shortenAddress(d.address)}
              </p>
            )}
            {/* A filled pill, not a plain caption — deliberately more
                visually prominent than the address line beside it, but
                still a single neutral gray/muted treatment regardless of
                which band value this is (per the handoff's rule: never a
                tone/color signal, just more legible metadata). */}
            {d.concentrationBand && CONCENTRATION_BAND_LABEL_KEYS[d.concentrationBand] && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-inset px-2 py-0.5 text-[11px] font-semibold text-ink-secondary shrink-0">
                <ScaleIcon className="h-3 w-3 text-ink-muted" />
                {t(CONCENTRATION_BAND_LABEL_KEYS[d.concentrationBand])}
                {d.networkRank != null ? ` · #${d.networkRank}` : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
