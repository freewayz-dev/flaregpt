import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { DonationCoin } from "@/config/donation";

// Amber, not red — this is precaution, not an error state. Matches the same
// `amber-500` semantic StatusBadge already uses for its "warning" tone
// elsewhere, just promoted to a full-width callout since this is the one
// piece of information on the page that actually matters if missed.
// Wording is parameterized by the selected coin's network/symbol rather
// than hardcoded to Flare, since the same caution applies per-network for
// every one of the five supported coins.
interface WarningCalloutProps {
  coin: DonationCoin;
}

export default function WarningCallout({ coin }: WarningCalloutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 sm:p-5">
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <p className="text-sm leading-relaxed text-ink-secondary">
        <span className="font-semibold text-ink-primary">
          {t("donate.warning.title", { network: coin.network })}
        </span>{" "}
        {t("donate.warning.body", {
          symbol: coin.symbol,
          network: coin.network,
        })}
      </p>
    </div>
  );
}
