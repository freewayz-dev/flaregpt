import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import { DONATION_COINS } from "@/config/donation";
import CoinSelector from "@/pages/Donate/components/CoinSelector";
import HeroReceiveCard from "@/pages/Donate/components/HeroReceiveCard";
import WarningCallout from "@/pages/Donate/components/WarningCallout";
import SuggestedAmounts from "@/pages/Donate/components/SuggestedAmounts";
import DonationsReceived from "@/pages/Donate/components/DonationsReceived";
import SupportGrid from "@/pages/Donate/components/SupportGrid";

// V1 was single-FLR and entirely static; this now supports 5 coins via the
// DONATION_COINS registry (src/config/donation.js), but the page is still
// fully static otherwise — no query, no loading state — so it renders
// immediately with no skeleton. `selectedCoinId` is the one piece of page
// state: CoinSelector sets it, and the coin-dependent sections (hero card,
// warning, suggested amounts) all derive their content from the same
// looked-up coin object, which is what keeps switching coins a single,
// consistent update rather than five independent ones drifting out of sync.
export default function Donate() {
  const { t } = useTranslation();
  const [selectedCoinId, setSelectedCoinId] = useState(DONATION_COINS[0].id);

  const selectedCoin =
    DONATION_COINS.find((coin) => coin.id === selectedCoinId) ??
    DONATION_COINS[0];

  return (
    <div className="space-y-8 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("donate.title")}
          description={t("donate.description")}
        />
      </div>

      <CoinSelector activeId={selectedCoinId} onChange={setSelectedCoinId} />

      <HeroReceiveCard coin={selectedCoin} />
      <WarningCallout coin={selectedCoin} />
      <SuggestedAmounts coin={selectedCoin} />

      <DonationsReceived />
      <SupportGrid />

      <div className="py-4 text-center">
        <HeartIcon className="mx-auto h-6 w-6 text-brand" />
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-secondary">
          {t("donate.closing.message")}
        </p>
      </div>
    </div>
  );
}
