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

function formatCell(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
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

export default function GenericTable({
  items,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}) {
  if (!items?.length) {
    return (
      <WalletEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const columns = Object.keys(items[0]);

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
      <table className="w-full text-left text-xs">
        <thead>
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
                  className="py-2.5 pr-4 text-ink-primary font-medium whitespace-nowrap"
                >
                  {formatCell(item[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
