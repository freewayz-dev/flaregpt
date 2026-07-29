// `label` surfaces the real-time chat socket's own `status` frames (e.g.
// "Wallet ftso analytics...") — optional because a guest/no-wallet turn
// never emits any and the plain dots are still a perfectly fine "thinking"
// state on their own.
export default function ThinkingIndicator({ label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce" />
      </div>
      {label && <span className="text-xs text-ink-muted">{label}</span>}
    </div>
  );
}
