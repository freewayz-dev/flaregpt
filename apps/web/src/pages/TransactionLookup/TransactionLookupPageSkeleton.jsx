import { useTranslation } from "react-i18next";

import PageHeader from "@/components/common/PageHeader";

// Route-level Suspense fallback while the page chunk itself loads — same
// pattern as FirePageSkeleton/LinksPageSkeleton. No in-page data skeleton
// needed underneath it the way Fire's own FireSkeleton is: this page has
// nothing to load until a search is actually submitted, so the form
// itself (rendered instantly once the chunk resolves) is the resting
// state, not a loading one.
export default function TransactionLookupPageSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-5 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader
          title={t("sidebar.transactionLookup")}
          description={t("transactionLookup.description")}
        />
      </div>
      <div className="skeleton h-[92px] rounded-2xl" />
    </div>
  );
}
