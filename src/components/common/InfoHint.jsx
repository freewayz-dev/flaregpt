import { useEffect, useRef, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

// The one reusable "what does this mean" affordance for the whole
// dashboard — click/tap to open a small popover, same interaction
// everywhere so learning it once (the muted ⓘ next to a label) transfers
// to every other card/table/chart that has one. Deliberately click-
// triggered, not hover-triggered: hover has no equivalent on a touchscreen,
// and this app has no other hover-only pattern to match anyway.
//
// The show/hide mechanics (always-mounted panel, toggled via
// opacity/scale/invisible classes, click-outside + Escape to dismiss) are
// the exact same shape already used by this app's other small floating
// panels — WalletContextPill's wallet-switcher dropdown and
// ActivityToolbar's ExportMenu — reused here rather than introducing a
// second floating-panel implementation (or a new dependency; this app has
// no popover/floating-ui library and doesn't need one for a fixed-size
// panel anchored to its own trigger).
//
// `label` doubles as both the popover's own small heading (so it reads
// like a mini glossary entry: term, then explanation) and the trigger's
// `aria-label` — every instance needs a distinct one anyway once there's
// more than one info icon on a page, so there's no real saving in
// splitting it into two props.
//
// The popover panel resets `normal-case`/`tracking-normal`/`whitespace-
// normal` explicitly — `position: absolute` takes this out of normal
// layout flow, but CSS inheritance still runs through the real DOM tree
// regardless of position, so a trigger placed inside a `uppercase`/
// `tracking-wide`/`whitespace-nowrap` ancestor (a table header cell is the
// real case that surfaced this: `<th className="... uppercase whitespace-
// nowrap">` around an InfoHint) would otherwise inherit all three into the
// popover's own body text — the whitespace-nowrap case is the most
// damaging of the three, since it silently renders the explanation as one
// very long unwrapped line that runs off past the panel's own edge instead
// of wrapping, rather than something merely cosmetic.
export default function InfoHint({ label, children, align = "left", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-muted hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <InformationCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div
        // `text-left` joins the same normal-case/tracking-normal/
        // whitespace-normal reset above and for the same reason:
        // `position: absolute` takes this panel out of normal layout, but
        // CSS inheritance still runs through the real DOM tree regardless
        // of position. `align="right"` only changes which edge the panel
        // is anchored to (so it opens leftward instead of overflowing the
        // viewport) — it says nothing about the text's own alignment, but
        // without this explicit reset a trigger placed inside a
        // `text-right` ancestor (a right-aligned table header, e.g.
        // AgentsTable.jsx's Fee/Free Capacity/Collateral Ratio columns)
        // would leak that alignment into the popover's own paragraphs,
        // right-aligning explanatory prose that reads far worse ragged on
        // the left than the default, deliberate left alignment every other
        // InfoHint already has.
        className={`absolute z-20 top-full mt-1.5 w-60 rounded-xl border border-line bg-surface-card p-3 shadow-lg normal-case tracking-normal whitespace-normal text-left transition-all duration-150 ${
          align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
        } ${open ? "opacity-100 scale-100" : "invisible opacity-0 scale-95 pointer-events-none"}`}
      >
        <p className="text-xs font-semibold text-ink-primary">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{children}</p>
      </div>
    </span>
  );
}
