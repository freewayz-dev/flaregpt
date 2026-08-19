import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon, LinkIcon } from "@heroicons/react/24/outline";

import PageHeader from "@/components/common/PageHeader";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import CategoryFilter from "@/pages/Links/components/CategoryFilter";
import LinkCard from "@/pages/Links/components/LinkCard";
import LinksGridSkeleton from "@/pages/Links/components/LinksGridSkeleton";
import { useLinks, useLinkCategories } from "@/hooks/queries/useLinksQueries";
import { filterLinksByCategory } from "@/pages/Links/utils/filterLinks";

// Fetched once with no category param, filtered entirely client-side — the
// API's own `?category=` param works but is deliberately unused here, so
// toggling the filter never triggers a second network request. Malformed
// records (confirmed live against the real API — one all-empty entry) are
// dropped in filterLinksByCategory regardless of which category is active.
export default function Links() {
  const { t } = useTranslation();
  const linksQuery = useLinks();
  const categoriesQuery = useLinkCategories();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredLinks = useMemo(
    () => filterLinksByCategory(linksQuery.data?.links, selectedCategory),
    [linksQuery.data, selectedCategory],
  );

  // Categories are a secondary enhancement to the page, not load-bearing —
  // if this query fails, the link grid below still renders unfiltered
  // rather than the whole page failing over one non-essential fetch.
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <div className="space-y-6 pb-14">
      <div className="pt-3 lg:pt-0">
        <PageHeader title={t("sidebar.links")} description={t("links.description")} />
      </div>

      {categories.length > 0 && (
        <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      )}

      {linksQuery.isLoading ? (
        <LinksGridSkeleton />
      ) : linksQuery.isError ? (
        <div role="alert" className="rounded-2xl bg-surface-inset px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-primary">{t("links.couldntLoad")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={() => linksQuery.refetch()}
            disabled={linksQuery.isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${linksQuery.isFetching ? "animate-spin" : ""}`} />
            {linksQuery.isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : filteredLinks.length === 0 ? (
        <WalletEmptyState
          icon={LinkIcon}
          title={t("links.empty.title")}
          description={t("links.empty.description")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
