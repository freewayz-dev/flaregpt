import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import LinksGridSkeleton from "@/pages/Links/components/LinksGridSkeleton";

// Route-level Suspense fallback while the Links chunk itself loads — same
// pattern as LoopsPageSkeleton/FtsoRewardsPageSkeleton.
export default function LinksPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.links")} description={t("links.description")} />
      </div>
      <LinksGridSkeleton />
    </div>
  );
}
