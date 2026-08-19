import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

// Shared chrome for ProviderRankingCard/ValidatorRankingCard — header,
// loading skeleton, error+retry, and empty state, so the two only ever
// differ in their own row markup. Same card shape (rounded-2xl/border/
// padding) ComingSoonTableCard used before these were wired to real data,
// and the same isLoading/isError/retry pattern this page's own top-level
// portfolio query already uses (see FtsoRewards/index.jsx) — kept
// consistent rather than inventing a second loading/error convention.
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-2.5 w-28 rounded" />
        <div className="skeleton h-2 w-16 rounded" />
      </div>
      <div className="skeleton h-2.5 w-12 rounded" />
    </div>
  );
}

export default function RankingCardShell({
  icon: Icon,
  title,
  caption,
  isLoading,
  isError,
  onRetry,
  isFetching,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-4 sm:p-6 shadow-sm border border-[#E5E7EB] dark:border-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 text-ink-muted shrink-0" />}
          <h3 className="text-sm font-semibold text-ink-primary truncate">{title}</h3>
        </div>
      </div>
      {caption && <p className="mt-1 text-xs text-ink-muted max-w-md">{caption}</p>}

      {isLoading ? (
        <div className="mt-4 divide-y divide-divider" role="status">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink-primary">{t("rankings.couldntLoad")}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={isFetching}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? t("dashboard.common.retrying") : t("dashboard.common.retry")}
          </button>
        </div>
      ) : isEmpty ? (
        <div className="mt-4 rounded-xl bg-surface-inset px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink-primary">{emptyTitle}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{emptyDescription}</p>
        </div>
      ) : (
        // Fixed max-height + internal scroll, same reasoning as
        // GenericTable.jsx (the dashboard's other long-list container):
        // once there are more rows than comfortably fit, the card scrolls
        // internally instead of stretching the page into one long table.
        // The card's own header/caption above is already outside this
        // scrolling region, so it stays visible without needing its own
        // sticky treatment.
        <div
          className="mt-4 max-h-[420px] overflow-y-auto overscroll-y-contain scrollbar-none divide-y divide-divider"
        >
          {children}
        </div>
      )}
    </div>
  );
}
