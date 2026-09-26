import { useTranslation } from "react-i18next";
import {
  ServerStackIcon,
  PuzzlePieceIcon,
  HeartIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

const ITEMS = [
  { icon: ServerStackIcon, titleKey: "donate.support.infra" },
  { icon: PuzzlePieceIcon, titleKey: "donate.support.integrations" },
  { icon: HeartIcon, titleKey: "donate.support.free" },
  { icon: CodeBracketIcon, titleKey: "donate.support.development" },
];

// Gives the ask a reason, which does more for "premium and trustworthy"
// than any visual flourish — same inset-tile language as WalletBalancesCard
// and the DeFi page's MetricTile, just carrying a short label instead of a
// number.
export default function SupportGrid() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8">
      <h3 className="text-sm font-semibold text-ink-primary">
        {t("donate.support.title")}
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map(({ icon: Icon, titleKey }) => (
          <div
            key={titleKey}
            className="flex items-center gap-3 rounded-xl bg-surface-inset p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-medium text-ink-primary">
              {t(titleKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
