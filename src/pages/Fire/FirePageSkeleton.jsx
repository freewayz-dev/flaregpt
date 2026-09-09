import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import FireSkeleton from "@/pages/Fire/components/FireSkeleton";

// Route-level Suspense fallback while the Fire page chunk itself loads —
// same pattern as LinksPageSkeleton/FtsoRewardsPageSkeleton.
export default function FirePageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.fire")} description={t("fire.description")} />
      </div>
      <FireSkeleton />
    </div>
  );
}
