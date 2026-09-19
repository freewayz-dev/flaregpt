import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CommandLineIcon, CheckIcon } from "@heroicons/react/24/outline";

import { changeLanguage } from "@/i18n";
import { LANGUAGE_OPTIONS } from "@/config/languages";
import ThemeToggle from "@/components/common/ThemeToggle";

// Dev-only convenience for iterating on UI without a Settings round trip —
// never rendered in production (see App.jsx's own `import.meta.env.DEV`
// gate, the same technique this app already uses for webVitals.ts's
// dev-only logging). Reuses the real theme/language state and controls
// verbatim (ThemeToggle, LANGUAGE_OPTIONS, i18n's own `changeLanguage`)
// rather than a parallel dev-only state system, so a change made here is
// the exact same call Settings itself (or the landing page's own
// LanguageSelector) would make — nothing here can ever disagree with them
// about the current theme/language.
//
// Deliberately plain, hardcoded English copy, not run through `t()` — this
// UI is stripped from every production build (see the gate above) and never
// seen by a real end user in any locale, so translating it would be pure
// busywork against the actual reason the "everything needs 14 translations"
// rule exists.
//
// Same click-toggle / floating-panel mechanics as every other small popover
// in this app (WalletContextPill, ExportMenu, InfoHint): an always-mounted
// panel toggled via opacity/scale/invisible classes, plus click-outside and
// Escape to dismiss — reused again here rather than a fifth bespoke
// implementation of the same interaction.
//
// Language is a flat, always-visible, internally-scrollable list here
// instead of reusing Settings' own CustomSelect — CustomSelect's own
// dropdown always opens *downward* from its trigger, which works fine
// inside a normal page but breaks badly anchored this close to the bottom
// of the viewport: with the language field placed low in this panel, its
// listbox opened straight past the bottom of the screen with most options
// unreachable. A flat list has nothing to open, so there's nothing to clip
// — and for a "just tap the language you want" dev shortcut, one click
// instead of open-then-click is the better interaction anyway.
export default function DevQuickSettings() {
  const { i18n } = useTranslation();
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

  const handleLanguageChange = (code) => changeLanguage(code);

  return (
    <div
      ref={ref}
      // z-[60], not z-40/z-50 — Sidebar.jsx's own <aside> carries a
      // `transform` (its collapse/slide transition, present even at rest
      // as an identity matrix) despite being `lg:static`. Per spec, any
      // non-"none" transform makes an element participate in z-index
      // stacking as if it were positioned, even while `position: static` —
      // confirmed live via getComputedStyle (aside: `position: static`,
      // `transform: matrix(1,0,0,1,0,0)`), so its own `z-50` class was
      // silently winning over this panel's originally-lower z-40 at
      // desktop widths, where a bottom-left position sits inside the
      // sidebar's own column. Now positioned bottom-*right* at `lg:` and up
      // specifically to get out of that column entirely (left-anchored
      // below `lg:`, where the sidebar is an off-canvas drawer rather than
      // a persistent column, and FlareGPT's own floating chat toggle —
      // `lg:hidden` — is the one thing occupying bottom-right there).
      // z-[60] is kept regardless, both as a safety margin and because nothing
      // about the collision was specific to left-anchoring.
      className="fixed z-[60] bottom-[calc(1rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] lg:left-auto lg:right-[calc(1rem+env(safe-area-inset-right))]"
    >
      <div
        className={`absolute bottom-full mb-3 left-0 lg:left-auto lg:right-0 w-80 rounded-2xl border border-line bg-surface-card p-4 shadow-xl transition-all duration-150 origin-bottom-left lg:origin-bottom-right ${
          open ? "opacity-100 scale-100" : "invisible opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <p className="px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          Dev Tools
        </p>

        <div className="mt-3">
          <p className="px-0.5 text-xs font-medium text-ink-secondary">Theme</p>
          <div className="mt-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-4">
          <p className="px-0.5 text-xs font-medium text-ink-secondary">Language</p>
          <div className="mt-2 max-h-56 overflow-y-auto scrollbar-none divide-y divide-line rounded-xl bg-surface-inset p-1 space-y-0.5">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isActive = lang.code === i18n.language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand/10 text-brand font-medium"
                      : "text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary"
                  }`}
                >
                  <span className="shrink-0">{lang.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{lang.labelKey}</span>
                  {isActive && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Dev quick settings"
        title="Dev quick settings"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-card text-ink-secondary shadow-lg transition-colors hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <CommandLineIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
