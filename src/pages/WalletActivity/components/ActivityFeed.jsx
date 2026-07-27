import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useUIStore } from "@/store/useUIStore";
import TransactionRow from "@/pages/WalletActivity/components/TransactionRow";

const HEADER_HEIGHT = 36;
// Must stay in sync with TransactionRow's own padding for each density —
// the virtualizer positions every row by this estimate alone (no
// measureElement pass), so a mismatch between this number and the row's
// actual rendered height would show up as visible gaps or overlap.
const ROW_HEIGHT = { comfortable: 56, compact: 44 };

// Flattens {label, items[]} day groups into one array the virtualizer can
// walk linearly — a day header is just another row type with its own
// (smaller) estimated height, not a separate layout concern.
function flattenGroups(groups) {
  const flat = [];
  for (const group of groups) {
    flat.push({ kind: "header", key: `header-${group.key}`, label: group.label });
    for (const item of group.items) {
      flat.push({ kind: "row", key: item.actionId, item });
    }
  }
  return flat;
}

function DayHeader({ label }) {
  return (
    <div className="flex h-9 items-center bg-surface-card px-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}

// R4/R5: a wallet with 10,000+ rows would freeze the tab if every row were
// a real DOM node — @tanstack/react-virtual keeps ~20-30 mounted at once
// regardless of history size, sized/positioned via `translateY` inside a
// single spacer div sized to the *total* (unrendered) height, which is
// what lets native scrolling still feel correct.
//
// This trades the rest of the dashboard's "the whole page scrolls"
// convention for a bounded, internally-scrolling panel (the one other
// place in this app that already does this is FlareGPT's message list) —
// virtualizing against the real window scroll instead is possible via
// useWindowVirtualizer, but couples the row math to everything else on
// the page shifting layout above it; a bounded container is the lower-risk
// choice for a first pass and is easy to revisit later.
export default function ActivityFeed({ groups, selectedActionId, onSelect, totalCount, shownCount }) {
  const { t } = useTranslation();
  const density = useUIStore((state) => state.tableDensity);
  const rowHeight = ROW_HEIGHT[density] ?? ROW_HEIGHT.comfortable;
  const parentRef = useRef(null);
  const flatItems = useMemo(() => flattenGroups(groups), [groups]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flatItems[index].kind === "header" ? HEADER_HEIGHT : rowHeight),
    overscan: 12,
  });

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label={t("wallet.activity.feed.ariaLabel", { shown: shownCount, total: totalCount })}
      className="h-[70dvh] min-h-[420px] overflow-y-auto overscroll-contain rounded-2xl bg-surface-card border border-[#E5E7EB] dark:border-none shadow-sm scrollbar-none"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const flatItem = flatItems[virtualRow.index];
          return (
            <div
              key={flatItem.key}
              role={flatItem.kind === "row" ? "listitem" : undefined}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {flatItem.kind === "header" ? (
                <DayHeader label={flatItem.label} />
              ) : (
                <TransactionRow
                  item={flatItem.item}
                  isSelected={flatItem.item.actionId === selectedActionId}
                  onSelect={onSelect}
                  compact={density === "compact"}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
