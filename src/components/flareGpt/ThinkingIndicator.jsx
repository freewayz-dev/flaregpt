export default function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-brand/60 animate-bounce" />
    </div>
  );
}
