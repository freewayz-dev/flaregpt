import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";

// Route-level Suspense fallback while the Loops chunk itself loads — same
// reasoning as RflrVestingPageSkeleton/FtsoRewardsPageSkeleton: a
// page-shaped fallback here avoids a generic-GlobalSpinner-then-real-page
// flash. GasSniperCard already owns its own internal loading states once
// mounted (the status badge / toggle both render their own pulse placeholder
// while their query is in flight — see its own JSX), so this only needs to
// mirror its outer chrome (icon + title row, action slot), not duplicate
// that internal logic.
export default function LoopsPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-8 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.loops")} description={t("loops.description")} />
      </div>

      <div className="rounded-2xl bg-surface-card shadow-sm border border-[#E5E7EB] dark:border-none p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-1.5">
              <div className="skeleton h-3.5 w-24 rounded" />
              <div className="skeleton h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
