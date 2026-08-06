import { useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

function findScrollParent(el: HTMLElement | null): Element {
  let node = el?.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

// Tucks secondary/reference info (contract addresses, raw protocol totals)
// behind a single toggle so it doesn't compete with the headline stat and
// the user's own position for attention. Collapsed by default everywhere —
// the goal is a calm default view, not hidden-by-default data loss. Uses the
// same height/opacity + AnimatePresence pattern as the landing page's FAQ
// accordion, rather than an abrupt conditional render. `bordered` is turned
// off when this sits as its own column in a wide-screen 2-column layout,
// where a top rule would read as a stray line rather than a section break.
interface DisclosureProps {
  label: string;
  children: ReactNode;
  bordered?: boolean;
}

export default function Disclosure({ label, children, bordered = true }: DisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Expanding/collapsing only ever adds or removes content *below* this
  // trigger, so nothing above it should visibly move. In practice,
  // collapsing a long panel while scrolled down into (or past) it can leave
  // the scroll container's scrollTop pointing past the new, shorter
  // content — the browser then clamps it back, which reads as the page
  // suddenly jumping to an unrelated spot. Restoring the trigger's own
  // on-screen position after the animation settles undoes exactly that
  // clamp, so the user's place on the page survives both directions
  // instead of "losing their scroll position" (confirmed on mobile, where
  // the viewport is short enough that a ~250px panel is a large fraction
  // of it).
  const restoreScrollAnchor = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scrollParent = findScrollParent(trigger);
    const before = trigger.getBoundingClientRect().top;
    requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      const after = triggerRef.current.getBoundingClientRect().top;
      const delta = after - before;
      if (delta !== 0) scrollParent.scrollTop += delta;
    });
  };

  return (
    <div className={bordered ? "mt-5 border-t border-divider pt-4" : ""}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 rounded"
      >
        <span>{label}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false} onExitComplete={restoreScrollAnchor}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onAnimationComplete={restoreScrollAnchor}
            // Opts this element out of the browser's own automatic scroll
            // anchoring — without it, the browser's heuristic and this
            // component's own manual correction above can compete and
            // over/under-correct against each other instead of agreeing.
            style={{ overflowAnchor: "none" }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
