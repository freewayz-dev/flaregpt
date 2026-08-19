import { useTranslation } from "react-i18next";
import { BuildingLibraryIcon, TrophyIcon } from "@heroicons/react/24/outline";

import RankingCardShell from "@/pages/FtsoRewards/components/RankingCardShell";

// A genuinely static counterpart to RankingTablesSection, for
// FtsoRewardsPageSkeleton's use only. That file's own comment explains why
// reusing the real section there used to be safe: "nothing about it is
// actually loading." Once the real section started fetching
// provider/validator rankings, that stopped being true — this exists so
// the route-level Suspense fallback (shown before the page's own JS chunk
// has even finished loading) still costs nothing: two RankingCardShells
// forced into their loading state, no hooks, no network calls, same tabs/
// grid layout so the fallback and the real page never disagree on shape.
export default function RankingTablesSectionSkeleton() {
  const { t } = useTranslation();

  const providerShell = (
    <RankingCardShell icon={BuildingLibraryIcon} title={t("ftsoRewards.providers.title")} isLoading />
  );
  const validatorShell = (
    <RankingCardShell icon={TrophyIcon} title={t("ftsoRewards.validators.title")} isLoading />
  );

  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <div className="skeleton flex-1 h-[42px] rounded-xl" />
          <div className="skeleton flex-1 h-[42px] rounded-xl" />
        </div>
        <div className="mt-4">{providerShell}</div>
      </div>

      <div className="hidden lg:grid gap-5 lg:grid-cols-2">
        {providerShell}
        {validatorShell}
      </div>
    </>
  );
}
