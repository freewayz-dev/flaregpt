import FlareGptMark from "@/components/common/FlareGptMark";

// The one genuine full-page loading screen in the app (the top-level
// Suspense fallback in AppRoutes.tsx, shown before any page-specific
// skeleton has even downloaded) — every other loading state in the app is a
// page-shaped skeleton (DashboardSkeleton, WalletActivitySkeleton, etc.),
// which read better as "this specific page is loading" than a brand mark
// would. `animate-pulse` rather than a spin: the mark is a static badge,
// not a circular/symmetric shape, so rotating it reads as broken rather
// than "loading" — a gentle breathing fade is the standard treatment for a
// logo used as a loading indicator, and (like every other `animate-*`
// utility in this app) it's automatically neutralized by index.css's
// reduced-motion rules.
export default function GlobalSpinner() {
  return (
    <div className="flex items-center justify-center h-dvh bg-[#F0F4F9] dark:bg-[#101115]">
      <FlareGptMark className="h-14 w-14 shadow-lg shadow-brand/20 animate-pulse" />
    </div>
  );
}