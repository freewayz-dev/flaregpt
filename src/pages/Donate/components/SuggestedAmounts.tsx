import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import TokenIcon from "@/components/common/TokenIcon";
import type { DonationCoin } from "@/config/donation";

// Informational only — there's no payment logic to wire since this is a
// wallet-to-wallet transfer, not a checkout. Clicking a tile copies the
// address (same action as the hero card) with a warmer, amount-aware toast.
// Framing amounts like this is a well-worn donation-page pattern (GitHub
// Sponsors, Buy Me a Coffee) that helps people who want to give but aren't
// sure how much.
//
// The four "impact" captions (tier1..tier4) are intentionally generic
// ("A day of API costs", not "$50 covers...") so the same four strings work
// across every coin regardless of that coin's actual unit value — only the
// numbers (from coin.suggestedAmounts) change per coin, not the copy.
const TIER_KEYS = [
  "donate.amounts.impactTier1",
  "donate.amounts.impactTier2",
  "donate.amounts.impactTier3",
  "donate.amounts.impactTier4",
];

interface SuggestedAmountsProps {
  coin: DonationCoin;
}

export default function SuggestedAmounts({ coin }: SuggestedAmountsProps) {
  const { t } = useTranslation();

  const handleSelect = async (amount: number) => {
    try {
      await navigator.clipboard.writeText(coin.address);
      toast.success(
        t("donate.amounts.copiedToast", { amount, symbol: coin.symbol }),
      );
    } catch {
      toast.error(t("donate.hero.copyFailed"));
    }
  };

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm border border-[#E5E7EB] dark:border-none sm:p-8">
      <h3 className="text-sm font-semibold text-ink-primary">
        {t("donate.amounts.title")}
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        {t("donate.amounts.subtitle")}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {coin.suggestedAmounts.map((value, i) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className="group rounded-xl bg-surface-inset p-4 text-left transition-colors cursor-pointer hover:bg-surface-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            <div className="flex items-center gap-1.5">
              <TokenIcon symbol={coin.symbol} size={14} />
              <span className="text-base font-bold text-ink-primary transition-colors group-hover:text-brand-text">
                {value.toLocaleString()}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
              {t(TIER_KEYS[i])}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
