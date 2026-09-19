import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon } from "@heroicons/react/24/outline";

import { changeLanguage } from "@/i18n";
import { LANGUAGE_OPTIONS } from "@/config/languages";

// A compact, production language switcher — trigger shows only the current
// language's flag (no text label, so it costs almost no width in a tight
// navbar), opening a flat, always-visible, internally-scrollable list of
// all 15 languages rather than a native <select> or CustomSelect's own
// dropdown (which opens downward from its trigger; see DevQuickSettings'
// own comment on why that broke anchored near a viewport edge — the same
// risk applies to a navbar sitting at the very top of the page). Goes
// through `changeLanguage` (src/i18n/index.js) — the one shared mechanism
// every language control in this app now calls — so a change made here,
// in Settings, or in DevQuickSettings can never disagree with each other.
//
// Same click-toggle / floating-panel mechanics as every other small popover
// in this app (WalletContextPill, ExportMenu, InfoHint, DevQuickSettings):
// an always-mounted panel toggled via opacity/scale/invisible classes, plus
// click-outside and Escape to dismiss.
//
// Deliberately has no `relative` wrapper of its own around the trigger —
// the popover's `right-0`/`left-0` (align) needs to resolve against
// whatever row this sits in (e.g. LandingNavbar's whole CTA group), not
// against a wrapper sized to just the trigger button. Anchored to a
// button-width-only wrapper, the popover's edge landed wherever the flag
// button happened to sit rather than at that row's true edge, and on a
// narrow phone a fixed-width popover anchored that far in from the real
// edge extended past the *other* edge and clipped its own content. Render
// this inside a `position: relative` (or otherwise positioned) ancestor
// that spans the row it visually belongs to. `max-w-[calc(100vw-2rem)]`
// on the popover itself is a second, independent safety net — even
// anchored correctly, this keeps it from ever exceeding the viewport's
// own width with at least 1rem of breathing room on a genuinely narrow
// screen.
export default function LanguageSelector({ align = "right", className = "" }) {
  const { t, i18n } = useTranslation();
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

  const current =
    LANGUAGE_OPTIONS.find((lang) => lang.code === i18n.language) || LANGUAGE_OPTIONS[0];

  return (
    <div className={`shrink-0 ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("settings.cards.language")}
        title={current.labelKey}
        className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full border border-line bg-[#F8FAFC]/80 dark:bg-[#121214]/80 text-base backdrop-blur-sm transition-colors hover:border-brand/30 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">{current.flag}</span>
      </button>

      <div
        className={`absolute z-50 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto scrollbar-none divide-y divide-line rounded-2xl border border-line bg-surface-card p-1.5 shadow-xl transition-all duration-150 ${
          align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
        } ${open ? "opacity-100 scale-100" : "invisible opacity-0 scale-95 pointer-events-none"}`}
      >
        {LANGUAGE_OPTIONS.map((lang) => {
          const isActive = lang.code === i18n.language;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                changeLanguage(lang.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-brand/10 text-brand font-medium"
                  : "text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary"
              }`}
            >
              <span className="shrink-0" aria-hidden="true">{lang.flag}</span>
              <span className="min-w-0 flex-1 truncate">{lang.labelKey}</span>
              {isActive && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
