// Text+dot badge convention used throughout Dashboard (StatCard's "Live",
// ApiStatusBadge, FtsoPortfolioCard's "Connected"/"Read-only") — no filled
// pill/chip badge exists for this in the design system, so this matches
// that rather than introducing a new visual language.
//
// "danger" added for Governance's "Defeated" proposal status — the one
// outcome none of the existing three tones honestly represent (not a
// warning/caution, a genuinely negative result), using the same red-500
// the app already uses everywhere else for negative/destructive meaning
// (StatCard's negative delta, outbound transactions, ErrorFallback).


const TONE_CLASSES = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  neutral: "text-ink-muted",
  danger: "text-red-500",
};



export default function StatusBadge({ label, tone = "neutral", dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${TONE_CLASSES[tone]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === "success"
              ? "bg-emerald-500 animate-pulse"
              : tone === "warning"
                ? "bg-amber-500"
                : tone === "danger"
                  ? "bg-red-500"
                  : "bg-ink-muted"
          }`}
        />
      )}
      {label}
    </span>
  );
}
