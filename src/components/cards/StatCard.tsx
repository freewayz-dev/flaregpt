import type { ComponentType, ReactNode, SVGProps } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  // No current caller passes this (grepped every `<StatCard`/`cards = [...]`
  // site across Dashboard, RflrVesting, FtsoRewards, DefiProtocols, and
  // WalletActivity) — but unlike PageHeader's dropped `badge` prop, this one
  // IS read below (`isNegative`, the change/live footer branch), so it's a
  // real, currently-unused-but-live part of the contract, not dead code.
  change?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  live?: boolean;
  emphasis?: boolean;
  compact?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  live = false,
  // Both default off so every existing caller (Dashboard's StatRow) renders
  // exactly as before — these are opt-in for callers that want a KPI to
  // stand out (emphasis) or a leaner card when the footer slot always goes
  // unused (compact), rather than a change to StatCard's default look.
  emphasis = false,
  compact = false,
}: StatCardProps) {
  const isNegative = typeof change === "string" && change.trim().startsWith("-");

  // Real bug, found while typing `value` here as the `ReactNode` real
  // callers actually pass (RflrVesting's/FtsoRewards' stat cards wrap
  // theirs in `<SensitiveValue>`, not a plain string) — the old
  // `` `${title}: ${value}` `` template literal stringifies a React element
  // via its default `Object.prototype.toString`, producing a literal
  // "Total Balance: [object Object]" `aria-label` for every screen-reader
  // user on those two pages. Only building the combined label when `value`
  // is actually a string (or number) keeps every existing plain-string
  // caller's `aria-label` byte-for-byte identical, and gives the
  // ReactNode-value cards a real, if less specific, `aria-label` (just the
  // title) instead of a broken one.
  const ariaLabel =
    typeof value === "string" || typeof value === "number" ? `${title}: ${value}` : title;

  return (
    <div className="h-full rounded-2xl bg-surface-card hover:bg-surface-card-hover p-4 shadow-sm border border-[#E5E7EB] dark:border-none shrink-0 transition-colors duration-150">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-secondary truncate">{title}</p>
        {Icon && (
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${emphasis ? "text-brand" : "text-ink-muted"}`}
          />
        )}
      </div>

      {/* Emphasis is color-only, not a larger size — a bigger font here
          would make this card's intrinsic height differ from its siblings
          in the same row, which is exactly the "cards aren't equal height"
          bug a size-based emphasis caused before.
          `aria-label` here (not just relying on the visible text) is what
          keeps this heading meaningful non-visually — a screen reader user
          navigating by heading, which lands on exactly this element, used
          to hear a bare number like "$0.02451" with no idea what it was
          the value *of*; the title above it is a separate, unassociated
          `<p>`. Overriding the announced name to "title: value" fixes that
          without changing anything on screen (the visible text is still
          just the value). */}
      <h3
        aria-label={ariaLabel}
        className={`mt-1.5 text-xl font-bold truncate ${
          emphasis ? "text-brand" : "text-ink-primary"
        }`}
      >
        {value}
      </h3>

      {/* Fixed-height footer slot so all stat cards in a row are the same
          height whether or not they have a change/live indicator to show —
          skipped entirely in `compact` mode for a row where nothing ever
          fills it. */}
      {!compact && (
        <div className="mt-1 h-5 flex items-center">
          {change ? (
            <span
              className={`text-xs font-medium ${
                isNegative ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {change}
            </span>
          ) : live ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
