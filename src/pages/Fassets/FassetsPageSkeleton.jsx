import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import FassetsSkeleton from "@/pages/Fassets/components/FassetsSkeleton";

// Route-level Suspense fallback while the Fassets page chunk itself loads —
// same pattern as FirePageSkeleton/FtsoRewardsPageSkeleton.
export default function FassetsPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-5 sm:space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.fassets")} description={t("fassets.description")} />
      </div>
      <FassetsSkeleton />
    </div>
  );
}
