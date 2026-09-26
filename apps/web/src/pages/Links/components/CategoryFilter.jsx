import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { humanizeCategory } from "@/pages/Links/utils/filterLinks";

// Same segmented-tab shell Donate's CoinSelector uses (bg-surface-inset
// track, p-1, rounded-lg pills, overflow-x-auto so it scrolls on narrow
// screens instead of wrapping) with the same `layoutId`-driven sliding
// active pill, reused directly rather than the plain toggle-chip row this
// replaced — the user specifically wanted this tab-selector feel.
export default function CategoryFilter({ categories, selected, onSelect }) {
  const { t } = useTranslation();

  if (categories.length === 0) return null;

  const options = [null, ...categories];

  return (
    <div
      role="tablist"
      aria-label={t("links.filterLabel")}
      className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-inset p-1 scrollbar-none"
    >
      {options.map((category) => {
        const isActive = category === selected;
        return (
          <button
            key={category ?? "all"}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(category)}
            className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
              isActive ? "text-white" : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="linksCategoryActivePill"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                className="absolute inset-0 rounded-lg bg-brand"
              />
            )}
            <span className="relative z-10">{category ? humanizeCategory(category) : t("links.filterAll")}</span>
          </button>
        );
      })}
    </div>
  );
}
