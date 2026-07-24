// Small colored text pill communicating a wallet's permanent type (Primary
// vs Watchlist) — a permanent property of the wallet, deliberately separate
// from whatever visual signal marks it as currently "active" elsewhere.
// Shared between the Navbar's wallet dropdown and FlareGPT's wallet context
// pill so both surfaces speak the same visual language for the same
// concept, rather than each inventing its own badge.
export default function WalletBadge({ tone, text }) {
  return (
    <span
      className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
        tone === "primary"
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      }`}
    >
      {text}
    </span>
  );
}
