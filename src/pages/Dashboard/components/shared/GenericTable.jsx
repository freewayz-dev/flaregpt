import { useTranslation } from "react-i18next";

import { useUIStore } from "@/store/useUIStore";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";

// Renders a table whose columns are derived from whatever keys are actually
// present on the first item, rather than hardcoded field names. The FlareGPT
// API's `unclaimed_epochs_ledger` and `active_delegations` arrays are always
// empty in every sample response we have, so there's no confirmed shape to
// build fixed columns against — this adapts to real data once it exists
// instead of guessing field names and risking blank/broken cells.
function humanizeKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCell(value, yesLabel, noLabel) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? yesLabel : noLabel;
  if (typeof value === "string") {
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }
    return value;
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

// `height` is fixed, not a max-height — real ledgers now range from a
// couple of rows to 20+ (FTSO unclaimed epochs), and when this table sits
// beside a sibling card in a grid (Claims History next to Delegations
// Breakdown on Overview), a growing table used to force the whole card
// taller than its neighbor, which then stretched to match under the
// grid's default alignment — a big card next to a mostly-empty one. A
// fixed height applied to *both* the table and the empty state means
// every card built on GenericTable is the same height regardless of how
// many rows it actually has: a short table leaves quiet space below it
// rather than shrinking the card, and a long one scrolls internally
// rather than growing it.
export default function GenericTable({
  items,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  height = "320px",
}) {
  const { t } = useTranslation();
  const isCompact = useUIStore((state) => state.tableDensity) === "compact";

  if (!items?.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <WalletEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  const columns = Object.keys(items[0]);
  const yesLabel = t("dashboard.common.yes");
  const noLabel = t("dashboard.common.no");

  return (
    <div
      className="overflow-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none overscroll-contain"
      style={{ height }}
    >
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-surface-card">
          <tr className="border-b border-divider">
            {columns.map((col) => (
              <th
                key={col}
                className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap"
              >
                {humanizeKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-surface-inset transition-colors">
              {columns.map((col) => (
                <td
                  key={col}
                  className={`pr-4 text-ink-primary font-medium whitespace-nowrap ${
                    isCompact ? "py-1.5" : "py-2.5"
                  }`}
                >
                  {formatCell(item[col], yesLabel, noLabel)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
