import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";
import ActivitySkeletonBody from "@/pages/WalletActivity/components/WalletActivitySkeleton";

// Route-level Suspense fallback (the lazy chunk hasn't downloaded yet) —
// mirrors DashboardSkeleton/DefiProtocolsSkeleton: PageHeader renders for
// real since it needs no data, the rest reuses the same content skeleton
// the page itself shows while its query is loading, so there's no visible
// seam between "chunk loading" and "data loading".
export default function WalletActivitySkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.walletActivity")} description={t("wallet.activity.description")} />
      </div>
      <ActivitySkeletonBody />
    </div>
  );
}
