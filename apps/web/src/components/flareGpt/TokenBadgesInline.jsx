import TokenIcon from "@/components/common/TokenIcon";

// A row of token references inline in an assistant response — reuses the
// same TokenIcon used across Donate/DeFi/Navbar so a FlareGPT answer about
// "your sFLR position" visually belongs to the same product rather than
// naming tokens as plain text.


export default function TokenBadgesInline({ symbols }) {
  return (
    <div className="flex flex-wrap gap-2">
      {symbols.map((symbol) => (
        <span
          key={symbol}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1.5 text-xs font-semibold text-ink-primary"
        >
          <TokenIcon symbol={symbol} size={14} />
          {symbol}
        </span>
      ))}
    </div>
  );
}
