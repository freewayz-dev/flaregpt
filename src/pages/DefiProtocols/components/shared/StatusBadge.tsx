// Text+dot badge convention used throughout Dashboard (StatCard's "Live",
// ApiStatusBadge, FtsoPortfolioCard's "Connected"/"Read-only") — no filled
// pill/chip badge exists for this in the design system, so this matches
// that rather than introducing a new visual language.
export type StatusTone = "success" | "warning" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  neutral: "text-ink-muted",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
}

export default function StatusBadge({ label, tone = "neutral", dot = false }: StatusBadgeProps) {
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
                : "bg-ink-muted"
          }`}
        />
      )}
      {label}
    </span>
  );
}
