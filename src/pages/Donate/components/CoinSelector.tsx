import { motion } from "framer-motion";

import { DONATION_COINS } from "@/config/donation";
import TokenIcon from "@/components/common/TokenIcon";

// Same segmented-pill shell FlrPriceChart uses for its 1D/7D/30D/1Y range
// switcher (bg-surface-inset track, p-1, rounded-md pills) — scaled up to
// carry a token icon per pill and a `layoutId`-driven sliding background
// (framer-motion) instead of an instant color swap, so moving between
// coins reads as one continuous motion rather than five independent
// buttons. `overflow-x-auto` lets the row scroll horizontally on narrow
// screens without wrapping, so it never grows past one line.
interface CoinSelectorProps {
  activeId: string;
  onChange: (id: string) => void;
}

export default function CoinSelector({ activeId, onChange }: CoinSelectorProps) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-inset p-1 scrollbar-none"
    >
      {DONATION_COINS.map((coin) => {
        const isActive = coin.id === activeId;
        return (
          <button
            key={coin.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(coin.id)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
              isActive
                ? "text-white"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="coinSelectorActivePill"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                className="absolute inset-0 rounded-lg bg-brand"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <TokenIcon symbol={coin.symbol} size={16} />
              {coin.symbol}
            </span>
          </button>
        );
      })}
    </div>
  );
}
