import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import RflrVestingSkeleton from "@/pages/RflrVesting/components/skeletons/RflrVestingSkeleton";
import NetworkPulseSkeleton from "@/pages/RflrVesting/components/skeletons/NetworkPulseSkeleton";

// Route-level Suspense fallback while the RflrVesting chunk itself loads —
// built from the same per-section skeletons the page uses once mounted for
// its own query-loading state, matching the DefiProtocolsSkeleton/
// WalletActivitySkeleton precedent. Without this, the route fell back to
// the generic GlobalSpinner during the chunk download, then swapped straight
// to RflrVestingSkeleton once mounted — a visible spinner-then-skeleton
// flash every other lazy-loaded page here avoids by giving its own route a
// page-shaped fallback instead of the generic one.
export default function RflrVestingPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.rflrTracker")} description={t("rflrVesting.description")} />
      </div>

      <RflrVestingSkeleton />
      <NetworkPulseSkeleton />
    </div>
  );
}
