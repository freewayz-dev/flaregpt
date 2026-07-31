import { useTranslation } from "react-i18next";

// `label` surfaces the real-time chat socket's own `status` frames (e.g.
// "Wallet ftso analytics...") — optional because a guest/no-wallet turn
// never emits any and the plain dots are still a perfectly fine "thinking"
// state on their own. `role="status"` + a guaranteed text alternative
// (the generic fallback when no `label` arrives) means a screen reader
// user actually hears that something is happening instead of getting pure
// silence — three bouncing dots carry zero information non-visually.
export default function ThinkingIndicator({ label }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 py-1" role="status">
      <div className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce" />
      </div>
      <span className={label ? "text-xs text-ink-muted" : "sr-only"}>
        {label || t("flrgpt.thinking")}
      </span>
    </div>
  );
}
