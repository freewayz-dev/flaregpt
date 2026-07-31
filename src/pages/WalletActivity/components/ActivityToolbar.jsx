import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

import TokenIcon from "@/components/common/TokenIcon";

const DATE_RANGES = ["7D", "30D", "90D", "ALL"];

function Segmented({ options, value, onChange, getLabel = (o) => o }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1 shrink-0">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
            value === option ? "bg-brand text-white" : "text-ink-secondary hover:text-ink-primary"
          }`}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

// Previously two icon-only buttons (a document icon for CSV, a code-
// bracket icon for JSON) sitting next to a third, purely decorative
// download-tray icon — the actual download-tray glyph, the one anyone
// would instinctively tap first, did nothing. A single labeled "Export"
// trigger with the tray icon on the trigger itself, revealing the two
// real formats as named menu items, removes the ambiguity entirely rather
// than trying to make the old three-icon row less confusing.
function ExportMenu({ onExportCsv, onExportJson }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const select = (fn) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-secondary hover:bg-surface-inset hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        {t("wallet.activity.toolbar.export")}
        <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-full mt-1.5 w-40 origin-top-right rounded-xl border border-line bg-surface-card p-1 shadow-lg z-10 transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "invisible pointer-events-none opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={() => select(onExportCsv)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-surface-inset hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
        >
          <DocumentTextIcon className="h-4 w-4 shrink-0" />
          {t("wallet.activity.toolbar.exportCsv")}
        </button>
        <button
          type="button"
          onClick={() => select(onExportJson)}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-surface-inset hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
        >
          <CodeBracketIcon className="h-4 w-4 shrink-0" />
          {t("wallet.activity.toolbar.exportJson")}
        </button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        active ? "bg-brand/10 text-brand" : "bg-surface-inset text-ink-secondary hover:text-ink-primary"
      }`}
    >
      {children}
    </button>
  );
}

// Debounced 300ms before it reaches the actual filter — matches the exact
// pattern StrategyComparisonTable already uses for its amount input.
// Filtering itself always runs client-side over whatever's already
// loaded — there's no server-side search to call.
export default function ActivityToolbar({
  search,
  onSearchChange,
  availableAssets,
  selectedAssets,
  onToggleAsset,
  availableActions,
  selectedActions,
  onToggleAction,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  onExportCsv,
  onExportJson,
}) {
  const { t } = useTranslation();
  const [rawSearch, setRawSearch] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => onSearchChange(rawSearch), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSearch]);

  // Sorting mixed-asset amounts on one axis isn't a meaningful comparison
  // (WFLR and sFLR quantities aren't the same unit) — "Amount" only
  // appears as a sort option once filtering has narrowed the working set
  // to a single asset, per the approved review's R10.
  const sortOptions = selectedAssets.size === 1 ? ["newest", "oldest", "amount"] : ["newest", "oldest"];
  const showActionFilter = availableActions.length > 1;

  return (
    <div className="rounded-2xl bg-surface-card p-4 shadow-sm border border-[#E5E7EB] dark:border-none space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            id="wallet-activity-search"
            name="search"
            aria-label={t("wallet.activity.toolbar.searchPlaceholder")}
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder={t("wallet.activity.toolbar.searchPlaceholder")}
            className="w-full rounded-xl bg-surface-inset pl-9 pr-3 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none focus-within:outline focus-within:outline-2 focus-within:outline-brand/50 focus-within:outline-offset-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={DATE_RANGES} value={dateRange} onChange={onDateRangeChange} />
          <Segmented
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
            getLabel={(o) => t(`wallet.activity.toolbar.sort.${o}`)}
          />
          <ExportMenu onExportCsv={onExportCsv} onExportJson={onExportJson} />
        </div>
      </div>

      {(availableAssets.length > 1 || showActionFilter) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-divider pt-3">
          {availableAssets.length > 1 &&
            availableAssets.map((asset) => (
              <Chip key={asset} active={selectedAssets.has(asset)} onClick={() => onToggleAsset(asset)}>
                <TokenIcon symbol={asset} size={12} />
                {asset}
              </Chip>
            ))}
          {showActionFilter &&
            availableActions.map(({ action, label }) => (
              <Chip key={action} active={selectedActions.has(action)} onClick={() => onToggleAction(action)}>
                {label}
              </Chip>
            ))}
        </div>
      )}
    </div>
  );
}
