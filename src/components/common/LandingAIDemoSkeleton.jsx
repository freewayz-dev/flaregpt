import FlareGptMark from "@/components/common/FlareGptMark";

// Suspense fallback for the lazy-loaded LandingAIDemo (see LandingPage.tsx's
// own comment on why that's lazy now) — same outer shell classes
// (rounded-3xl card, header height, `h-[340px] sm:h-[380px]` message area,
// composer footer) as the real component, so swapping the real one in once
// its chunk loads causes no layout shift. Static header content (mark,
// "FlareGPT", "Live demo" badge) is real, not a placeholder — pulsing bars
// stand in only for the parts that genuinely don't exist yet (messages,
// composer).
export default function LandingAIDemoSkeleton() {
  return (
    <div
      className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white/80 shadow-xl backdrop-blur-xl dark:bg-[#111113]/90"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <FlareGptMark className="h-7 w-7" />
          <span className="text-sm font-bold text-ink-primary">FlareGPT</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live demo
        </span>
      </div>

      <div className="flex h-[340px] flex-col items-center justify-center gap-3 px-4 py-4 sm:h-[380px]">
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-surface-inset" />
        <div className="flex w-full max-w-xs flex-col gap-2">
          <div className="h-9 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="h-[42px] w-full animate-pulse rounded-2xl bg-surface-inset" />
        <div className="mt-2 flex justify-center">
          <div className="h-2.5 w-40 animate-pulse rounded-full bg-surface-inset" />
        </div>
      </div>
    </div>
  );
}
