import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Tucks secondary/reference info (contract addresses, raw protocol totals)
// behind a single toggle so it doesn't compete with the headline stat and
// the user's own position for attention. Collapsed by default everywhere —
// the goal is a calm default view, not hidden-by-default data loss. Uses the
// same height/opacity + AnimatePresence pattern as the landing page's FAQ
// accordion, rather than an abrupt conditional render. `bordered` is turned
// off when this sits as its own column in a wide-screen 2-column layout,
// where a top rule would read as a stray line rather than a section break.
export default function Disclosure({ label, children, bordered = true }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={bordered ? "mt-5 border-t border-divider pt-4" : ""}>
      <button
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
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
