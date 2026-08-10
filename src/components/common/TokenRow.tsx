import type { ReactNode } from "react";

import TokenIcon from "@/components/common/TokenIcon";

interface TokenRowProps {
  symbol?: string;
  label: ReactNode;
  value: ReactNode;
  highlight?: boolean;
  valueClassName?: string;
}

// Shared label/value row shape used across the Dashboard and DeFi Protocols
// pages, with a token icon standing in for a bare label so amounts are
// always paired with the mark of the token they're denominated in.
// `valueClassName` overrides the value's color entirely (used by
// FtsoPortfolioCard's Unclaimed FLR row) without touching `highlight`'s
// existing meaning for every other caller.
export default function TokenRow({
  symbol,
  label,
  value,
  highlight = false,
  valueClassName,
}: TokenRowProps) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <TokenIcon symbol={symbol} size={14} />
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${valueClassName ?? (highlight ? "text-brand-text" : "text-ink-primary")}`}
      >
        {value}
      </span>
    </div>
  );
}
