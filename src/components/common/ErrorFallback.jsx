import { ArrowPathIcon, HomeIcon } from "@heroicons/react/24/outline";
import { ROUTES } from "@/config/routes";

// Shared between the app-root boundary (App.jsx) and each page-level
// boundary (DashboardLayout.jsx) — the two differ only in severity: a
// crash caught at the root means the whole React tree is suspect, so it
// leads with a full page reload; a crash caught at the page level means
// the sidebar/navbar/footer around it are still alive and interactive, so
// it leads with the cheaper in-place retry and treats reload as a fallback
// rather than the primary action.
//
// `resetErrorBoundary` alone (react-error-boundary's own reset) only clears
// this boundary's *own* caught-error flag and remounts the same children —
// it does nothing about whatever external state (a bad cache entry, a
// corrupted store value) actually caused the crash. If that state is still
// there, the remounted tree crashes again immediately, which is
// indistinguishable from "the button doesn't do anything" (the exact
// complaint this was built to fix). The caller is expected to pass an
// `onRetry` that actually clears the implicated state (see App.jsx /
// DashboardLayout.jsx) before this component's button ever runs
// `resetErrorBoundary`.
export default function ErrorFallback({ error, resetErrorBoundary, variant = "page" }) {
  const isRoot = variant === "root";

  return (
    <div
      className={
        isRoot
          ? "min-h-dvh flex items-center justify-center p-6 bg-[#F0F4F9] dark:bg-[#101115]"
          : "flex items-center justify-center py-16 px-4"
      }
    >
      <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <h2 className="text-sm font-bold text-red-500">Something went wrong</h2>

        <p className="mt-1 text-xs font-mono text-ink-muted break-words">
          {error?.message || "An unexpected error occurred."}
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={resetErrorBoundary}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 shrink-0" />
            Try again
          </button>

          {!isRoot && (
            <a
              href={ROUTES.app}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-surface-inset px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
            >
              <HomeIcon className="h-3.5 w-3.5 shrink-0" />
              Go to Overview
            </a>
          )}

          {/* A full reload is the one recovery path that's *always*
              guaranteed to work, regardless of what's actually broken —
              offered as a fallback rather than the primary action so it's
              not the first thing reached for over the cheaper in-place
              retry. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-surface-inset px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
