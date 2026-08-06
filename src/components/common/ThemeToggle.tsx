import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

import { useUIStore, type Appearance } from "@/store/useUIStore";

const OPTIONS: { id: Appearance; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "light", icon: SunIcon },
  { id: "dark", icon: MoonIcon },
  { id: "system", icon: ComputerDesktopIcon },
];

// Three-way selector replacing the old binary sun/moon switch — the
// underlying store already modeled this as three states (`darkMode` +
// `hasThemeOverride`), it just had no way back to "system" once a user
// picked Light or Dark. Same equal-width segmented-pill shell used
// throughout the app (FlrPriceChart's timeframe switcher, Wallet
// Activity's chart tabs) rather than a new visual pattern for one control.
export default function ThemeToggle() {
  const { t } = useTranslation();
  const darkMode = useUIStore((state) => state.darkMode);
  const hasThemeOverride = useUIStore((state) => state.hasThemeOverride);
  const setAppearance = useUIStore((state) => state.setAppearance);

  const active = !hasThemeOverride ? "system" : darkMode ? "dark" : "light";

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-inset p-1" role="radiogroup">
      {OPTIONS.map(({ id, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setAppearance(id)}
            title={t(`settings.appearance.${id}`)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
              isActive ? "bg-brand text-white" : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t(`settings.appearance.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
