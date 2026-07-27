import { memo } from "react";
import {
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import TokenIcon from "@/components/common/TokenIcon";
import SensitiveValue from "@/components/common/SensitiveValue";
import { getActionDirection, formatActionLabel } from "@/pages/WalletActivity/utils/deriveActivity";

const DIRECTION_ICON = { out: ArrowUpRightIcon, in: ArrowDownLeftIcon, neutral: ArrowsRightLeftIcon };
const DIRECTION_COLOR = { out: "text-red-500", in: "text-emerald-500", neutral: "text-ink-secondary" };
const DIRECTION_BG = { out: "bg-red-500/10", in: "bg-emerald-500/10", neutral: "bg-surface-inset" };

function formatAmount(amount) {
  return Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTime(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Memoized: the virtualizer only mounts ~20-30 of these at once regardless
// of history size, but the feed re-renders on every filter/sort/search
// change, and there's no reason for a row whose own props haven't changed
// to re-render just because a sibling did. Direction is signaled with both
// an icon *and* a color (never color alone) — a colorblind user shouldn't
// need to distinguish send from receive by hue.
//
// A bottom border on every row (not just a wrapper `divide-y`) since rows
// are absolutely positioned by the virtualizer — there's no shared parent
// they're direct siblings of for `divide-y` to apply to. The trailing
// chevron only shows below `sm`: on desktop, hover is already a clear
// affordance a row is clickable; there's no hover on a touch screen, so
// mobile gets an explicit, persistent "this opens something" cue instead.
function TransactionRow({ item, isSelected, onSelect, compact = false }) {
  const direction = getActionDirection(item.action_tag);
  const DirectionIcon = DIRECTION_ICON[direction];

  return (
    <button
      type="button"
      onClick={() => onSelect(item.actionId)}
      aria-current={isSelected ? "true" : undefined}
      className={`flex h-full w-full items-center gap-3 border-b border-divider text-left transition-colors cursor-pointer focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand/50 ${
        compact ? "px-4 py-1" : "px-4 py-2.5"
      } ${isSelected ? "bg-brand/10" : "hover:bg-surface-inset"}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg ${DIRECTION_BG[direction]} ${
          compact ? "h-6 w-6" : "h-8 w-8"
        }`}
      >
        <DirectionIcon className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${DIRECTION_COLOR[direction]}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <TokenIcon symbol={item.asset} size={14} />
          <p className="truncate text-sm font-medium text-ink-primary">{item.asset}</p>
          <span className="hidden sm:inline text-xs text-ink-muted truncate">
            {formatActionLabel(item.action_tag)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-muted">{formatTime(item.timestamp)}</p>
      </div>

      <p className={`shrink-0 text-sm font-semibold tabular-nums ${DIRECTION_COLOR[direction]}`}>
        <SensitiveValue>
          {direction === "out" ? "-" : direction === "in" ? "+" : ""}
          {formatAmount(item.amount)}
        </SensitiveValue>
      </p>

      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted sm:hidden" aria-hidden="true" />
    </button>
  );
}

export default memo(TransactionRow);
