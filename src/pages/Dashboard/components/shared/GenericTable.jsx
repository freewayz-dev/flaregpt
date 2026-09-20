
import { useTranslation } from "react-i18next";

import { useUIStore } from "@/store/useUIStore";
import WalletEmptyState from "@/pages/Dashboard/components/shared/WalletEmptyState";
import SensitiveValue from "@/components/common/SensitiveValue";
import { shortenAddress } from "@/utils/address";

// Renders a table whose columns are derived from whatever keys are actually
// present on the first item, rather than hardcoded field names — every real
// caller passes either a raw API array (whose exact field names aren't
// fixed ahead of time) or a locally-derived one, so this adapts to
// whatever shape actually shows up instead of guessing field names and
// risking blank/broken cells.
//
// `COLUMN_LABEL_KEYS` maps every field name confirmed live across this
// component's actual callers (Overview's claims/delegations tables reading
// raw `unclaimed_epochs_ledger`/`active_delegations` entries, the FLR/gas
// charts' own derived rows, rFLR's melt-schedule rows, FTSO's epoch-ledger
// rows, Wallet Activity's histogram/breakdown rows) to a real translation
// key — this is what fixes column headers that used to be the untranslated,
// English-only output of `humanizeKey` on a raw API field name. Any column
// key not in this map (a genuinely new/unknown field) still falls back to
// `humanizeKey` so an unrecognized field never renders blank — this is the
// resilience the component was originally built for, just no longer the
// *only* path for cases we already know about.
const COLUMN_LABEL_KEYS = {
  // FlrPriceChart.jsx (FLR price history table)
  date: "dashboard.genericTable.columns.date",
  open: "dashboard.genericTable.columns.open",
  high: "dashboard.genericTable.columns.high",
  low: "dashboard.genericTable.columns.low",
  close: "dashboard.genericTable.columns.close",
  price: "dashboard.genericTable.columns.price",
  // NetworkActivityChart.jsx (gas price samples table)
  time: "dashboard.genericTable.columns.time",
  gwei: "dashboard.genericTable.columns.gwei",
  // ActivityCharts.jsx (Wallet Activity's own "view data" tables)
  label: "dashboard.genericTable.columns.label",
  count: "dashboard.genericTable.columns.count",
  asset: "dashboard.genericTable.columns.asset",
  action: "dashboard.genericTable.columns.action",
  // ClaimsHistoryCard.jsx (Overview) — raw `unclaimed_epochs_ledger` entries
  epoch_id: "dashboard.genericTable.columns.epoch",
  unclaimed_amount_flr: "dashboard.genericTable.columns.unclaimedFlr",
  // DelegationsBreakdownCard.jsx (Overview) — raw `active_delegations` entries
  provider_address: "dashboard.genericTable.columns.provider",
  provider_name: "dashboard.genericTable.columns.providerName",
  allocated_bips: "dashboard.genericTable.columns.allocation",
  weight_percentage: "dashboard.genericTable.columns.weight",
  network_rank: "dashboard.genericTable.columns.networkRank",
  concentration_band: "dashboard.genericTable.columns.concentration",
  // UnlockTimelineCard.jsx (rFLR melt-schedule rows)
  unlock_date: "dashboard.genericTable.columns.unlockDate",
  source: "dashboard.genericTable.columns.source",
  amount_flr: "dashboard.genericTable.columns.amount",
  status: "dashboard.genericTable.columns.status",
  // UnclaimedEpochsCard.jsx (FTSO Rewards epoch-ledger rows)
  epoch: "dashboard.genericTable.columns.epoch",
  unclaimed_flr: "dashboard.genericTable.columns.unclaimedFlr",
};

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
      return shortenAddress(value);
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
          title={emptyTitle ?? ""}
          description={emptyDescription ?? ""}
        />
      </div>
    );
  }

  const columns = Object.keys(items[0]);
  const yesLabel = t("dashboard.common.yes");
  const noLabel = t("dashboard.common.no");

  return (
    <div
      // Deliberately no `overscroll-y-contain` here (an earlier version
      // had one, reasoning that once this table hit its own top/bottom
      // that shouldn't also rubber-band/scroll the page behind it) —
      // confirmed live that containing it instead trapped the gesture: a
      // mobile user scrolling down inside this table, on reaching its own
      // bottom, had to lift their finger and place it *outside* the table
      // before the page itself would continue scrolling. Default
      // `overscroll-behavior: auto` lets that handoff happen naturally the
      // instant this table can't scroll any further in that direction,
      // which is the actually-expected mobile scrolling behavior.
      className="overflow-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
      style={{ height }}
    >
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-surface-card">
          <tr className="border-b border-divider">
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="py-2 pr-4 font-semibold text-ink-muted uppercase tracking-wide text-[10px] whitespace-nowrap"
              >
                {COLUMN_LABEL_KEYS[col] ? t(COLUMN_LABEL_KEYS[col]) : humanizeKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-surface-inset transition-colors">
              {columns.map((col) => {
                const raw = item[col];
                const formatted = formatCell(raw, yesLabel, noLabel);
                // Every row here is this wallet's own claims/delegations
                // ledger — a numeric cell is a reward or stake amount, not
                // an identifier, so it's exactly the kind of figure the
                // hide-balances toggle exists for. Non-numeric cells (an
                // address, a date, a status) carry no balance information
                // and stay visible regardless.
                return (
                  <td
                    key={col}
                    className={`pr-4 text-ink-primary font-medium whitespace-nowrap ${
                      isCompact ? "py-1.5" : "py-2.5"
                    }`}
                  >
                    {typeof raw === "number" ? (
                      <SensitiveValue>{formatted}</SensitiveValue>
                    ) : (
                      formatted
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
