import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useUIStore } from "@/store/useUIStore";

interface SensitiveValueProps {
  children: ReactNode;
}

// Swaps the real value for a fixed-width dot mask rather than CSS-blurring
// it — a blur still leaks rough length/shape, dots don't, and the width
// stays constant regardless of the underlying number's digit count.
export default function SensitiveValue({ children }: SensitiveValueProps) {
  const { t } = useTranslation();
  const hideBalances = useUIStore((state) => state.hideBalances);

  if (!hideBalances) return children;

  return (
    <span aria-label={t("navbar.balancesHiddenLabel")} className="tracking-widest select-none">
      ••••••
    </span>
  );
}
