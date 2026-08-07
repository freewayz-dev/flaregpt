import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FlareWidget from "@/components/common/FlareWidget";
import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import ErrorFallback from "@/components/common/ErrorFallback";
import OfflineBanner from "@/components/common/OfflineBanner";
import StaleDataBanner from "@/components/common/StaleDataBanner";
import InstallAppBanner from "@/components/common/InstallAppBanner";
import { useWalletActivityNotifier } from "@/hooks/useWalletActivityNotifier";
import { useUIStore } from "@/store/useUIStore";
import { ROUTES } from "@/config/routes";

// The shape passed to every routed page via <Outlet context={...}> below —
// shared here (not redefined per page) since useOutletContext<T>() has no
// way to check T against what's actually provided, so every consumer needs
// the same source of truth.
export interface DashboardOutletContext {
  openWalletModal: () => void;
}

// GlobalSpinner is h-dvh, which is correct for AppRoutes' top-level
// fallback (rendered before any layout exists) but would briefly exceed
// main's actual available height here, popping main's own scrollbar in and
// out on every route change. This fallback just centers within whatever
// space it's given instead.
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
    </div>
  );
}

// Scoped to the routed page content specifically (not the whole app, see
// App.jsx for that last-resort boundary) — a crash in one page's data or
// rendering shouldn't take the sidebar/navbar/footer down with it; those
// stay mounted and interactive so navigating elsewhere is still possible
// even while this page is broken.
//
// `resetKeys={[pathname]}` means navigating to a *different* route auto-
// resets a tripped boundary — so leaving a broken page and coming back
// later (or just going somewhere else entirely) gets a fresh mount without
// needing the retry button at all. `onReset` additionally clears the
// query cache before the in-place "Try again" button remounts this page,
// for the same reason App.jsx's root boundary does: a stale/corrupt cached
// query result would otherwise survive the remount and crash it again
// immediately.
interface PageErrorBoundaryProps {
  pathname: string;
  queryClient: QueryClient;
  children: ReactNode;
}

function PageErrorBoundary({ pathname, queryClient, children }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={[pathname]}
      FallbackComponent={ErrorFallback}
      onReset={() => queryClient.clear()}
      onError={(error, info) => {
        console.error("[ErrorBoundary:page]", pathname, error, info?.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default function DashboardLayout() {
  // Auth sync itself is mounted at the App root now (see App.jsx) — wagmi's
  // connection state isn't scoped to this layout, so the hook that reacts
  // to it shouldn't be either.
  // R15: keeps watching a large wallet's activity fetch even after the
  // page that started it unmounts — see the hook for why.
  useWalletActivityNotifier();

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The floating "Ask FlareGPT" entry points exist so the assistant is
  // reachable from any *other* page — tapping "Ask FlareGPT" while
  // already on the dedicated FlareGPT page would be a redundant, slightly
  // confusing affordance pointing at the thing you're already looking at.
  const isFlareGptPage = location.pathname.startsWith(ROUTES.flareGpt);

  // Lightweight first-launch onboarding: one dismissible toast, shown once
  // ever per browser, not a multi-step tour — the roadmap explicitly calls
  // for "avoid... unnecessary onboarding," and this app's own dashboard is
  // already self-explanatory enough (cards, a sidebar, an obvious "Connect
  // Wallet" control) that anything heavier would be explaining UI that
  // doesn't need explaining. `hasSeenWelcome` persists in useUIStore, so a
  // page refresh or a later session never re-shows it.
  const hasSeenWelcome = useUIStore((state) => state.hasSeenWelcome);
  useEffect(() => {
    if (hasSeenWelcome) return;
    toast(t("onboarding.welcomeMessage"), { autoClose: 8000 });
    useUIStore.getState().markWelcomeSeen();
    // Deliberately fires once on mount only, regardless of hasSeenWelcome
    // changing identity afterward — re-running this on every state change
    // would defeat the entire "once ever" point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warms every other dashboard route's JS chunk once this layout mounts
  // (i.e. once the user has actually reached `/app/*`, same signal
  // InstallAppBanner's own "once per visit" effect uses) — same
  // requestIdleCallback pattern LandingPage.tsx already uses to prefetch
  // the Dashboard chunk before "Launch App" is even clicked, just applied
  // to every *sibling* route instead of one. Without this, a page you
  // never happened to click into before going offline has no cached JS to
  // load from at all: sw.ts's CacheFirst script route only ever populates
  // a chunk the first time something actually requests it, so an
  // unvisited route's dynamic `import()` genuinely has nothing to fall
  // back to offline and throws (surfacing as "Importing module script
  // failed" — confirmed reproducible for exactly this reason). This
  // doesn't change *when* a route's own code is needed for it to render,
  // only pre-populates the cache in the background well before offline
  // navigation would ever need it; a real navigation's own `import()` call
  // for an already-warmed chunk just resolves instantly from the same
  // cache instead of hitting the network again.
  useEffect(() => {
    const prefetch = () =>
      Promise.all([
        import("@/pages/Dashboard"),
        import("@/pages/Flrgpt"),
        import("@/pages/Settings"),
        import("@/pages/Help"),
        import("@/pages/DefiProtocols"),
        import("@/pages/Loops"),
        import("@/pages/RflrVesting"),
        import("@/pages/FtsoRewards"),
        import("@/pages/WalletActivity"),
        import("@/pages/Donate"),
      ]).catch(() => {
        // Best-effort warming only — a failed prefetch here (e.g. genuinely
        // offline already) isn't a user-facing error; the route's own
        // Suspense/ErrorBoundary is what actually handles a real failed
        // navigation later.
      });
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 2000);
    return () => clearTimeout(id);
  }, []);

  // React Router's own <ScrollRestoration> needs a data router
  // (createBrowserRouter) — this app deliberately stays on plain
  // <BrowserRouter>/<Routes> (see the React Router v8 migration plan; not
  // revisiting that architecture choice for this), so there's no built-in
  // equivalent. It also wouldn't apply here even with one: that component
  // restores `window`'s own scroll position, but this app's actual scroll
  // container is `main` itself (`overflow-y-auto` — the root shell is a
  // fixed `h-dvh`, `window` never scrolls at all here). Every other page
  // (not FlareGPT's own `main`, which is `overflow-hidden` — MessageList
  // scrolls internally instead, unrelated to route changes) previously
  // stayed wherever it was scrolled to when you navigated to a genuinely
  // different page, which is a real, jarring "not a native app" bug this
  // fixes directly: landing on a new page already scrolled halfway down.
  const mainScrollRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainScrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);
  // Now that mobile relies on the widget as its *only* entry point (the
  // sidebar link is hidden below `lg`, see Sidebar.jsx), the widget's
  // mobile full-screen mode needs to behave like any other full-screen
  // mobile surface: hardware/gesture back should close it, not navigate
  // the page underneath it away. Opening it pushes a history entry only
  // when it's actually rendering full-screen (FlareWidget's own `sm:`
  // breakpoint, not the wider `lg` used for nav visibility) — a desktop/
  // tablet floating panel isn't a full-screen takeover and back-button
  // hijacking isn't the expected behavior for it.
  const flareWidgetHistoryOwnedRef = useRef(false);

  useEffect(() => {
    if (!flareWidgetOpen) return;
    const isFullScreenWidget = window.matchMedia("(max-width: 639px)").matches;
    if (!isFullScreenWidget) return;

    window.history.pushState({ flareGptWidget: true }, "");
    flareWidgetHistoryOwnedRef.current = true;

    const handlePopState = () => {
      flareWidgetHistoryOwnedRef.current = false;
      setFlareWidgetOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [flareWidgetOpen]);

  // `skipBack` lets a caller that's about to navigate elsewhere (opening
  // the full page from inside the widget) reset the open state without
  // racing an async `history.back()` against its own navigation — the
  // real route's `replace` then cleanly absorbs the dummy entry instead.
  const closeFlareWidget = ({ skipBack = false } = {}) => {
    if (flareWidgetHistoryOwnedRef.current) {
      flareWidgetHistoryOwnedRef.current = false;
      if (skipBack) {
        setFlareWidgetOpen(false);
      } else {
        window.history.back();
      }
    } else {
      setFlareWidgetOpen(false);
    }
  };

  const toggleFlareWidget = () => {
    if (flareWidgetOpen) {
      closeFlareWidget();
    } else {
      setFlareWidgetOpen(true);
    }
  };

  // Consumes the signal `/app/flare-gpt` (see Flrgpt/index.jsx) leaves
  // behind when it redirects a sub-`lg` landing here instead of rendering
  // the dedicated page — opens the widget once, then strips the param so
  // a later refresh of the same URL doesn't reopen it every time.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("openFlareGpt") !== "1") return;
    setFlareWidgetOpen(true);
    params.delete("openFlareGpt");
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Lifted here (rather than owned by Sidebar alone) so both Sidebar's
  // footer control and Navbar's wallet dropdown can open the same single
  // modal instance instead of each mounting its own.
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  // Both memoized (not a fresh function + fresh object literal every
  // render) — `<Outlet context={...}>` below hands this to every routed
  // page via `useOutletContext()` (Flrgpt, Settings/Wallets,
  // Settings/FlareGpt, Loops/GasSniperCard all read it), and React treats a
  // new context *value* as a real change regardless of whether anything a
  // consumer actually cares about moved. Unmemoized, this component's own
  // local UI state — sidebarOpen, flareWidgetOpen, walletModalOpen, even a
  // route change — rerendered every one of those pages on every toggle,
  // none of which have anything to do with e.g. the sidebar's open/closed
  // state. `setWalletModalOpen` is a stable dispatch function (React
  // guarantees this), so an empty dependency array is correct, not a lie.
  const openWalletModal = useCallback(() => setWalletModalOpen(true), []);
  const outletContext = useMemo(() => ({ openWalletModal }), [openWalletModal]);

  return (
    <div className="h-dvh overflow-hidden bg-[#F0F4F9] dark:bg-[#101115] flex flex-col pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Padding, not applied per-element — whichever row ends up first
          (a banner above, or Navbar's own header if none are showing)
          shifts down together below a device's notch/status-bar cutout.
          The background here already fills the whole viewport (`h-dvh`)
          regardless, so this is purely about not letting *content* sit
          under the cutout, not a color/gap fix. Every `fixed`-positioned
          element elsewhere (the mobile menu, its backdrop, the FlareGPT
          FAB, Sidebar's mobile drawer) is anchored to the real viewport,
          not this padded box, so each carries its own matching
          `env(safe-area-inset-*)` rather than inheriting this. Bottom
          isn't included here on purpose: Composer.tsx and the FAB already
          each apply their own `safe-area-inset-bottom`, and adding a
          third here would stack a redundant gap on top of theirs. */}
      <OfflineBanner />
      <StaleDataBanner />
      <InstallAppBanner />
      {/* `transform-gpu` (a pre-existing, GPU-compositing hint that isn't
          animating anything on this specific box) used to sit here. A CSS
          `transform` on any value other than `none` makes its element the
          containing block for every `position: fixed` (and `absolute`)
          descendant — instead of the real viewport — which is exactly
          what FlareWidget's `<aside className="fixed ...">` relies on to
          anchor itself to the actual browser window. Reassigning that
          containing block to this row doesn't just reposition FlareWidget
          (which still visually landed in the right place, by coincidence,
          since this row also happens to span the full viewport width) —
          it also pulls FlareWidget into *this row's own* scrollable
          overflow area. That was invisible while FlareWidget only ever
          rendered a short suggestions list, but once a real conversation
          existed (richer, taller content — tables, charts, more messages)
          the row's own scrollWidth/scrollHeight grew to include it, and
          the browser's overflow anchoring shifted the row (sidebar
          included) left to compensate — on every *other* page, since
          FlareGPT's own route never mounts FlareWidget at all. Each
          descendant's own `transition`/`transform` still gets GPU
          compositing independently; removing it here doesn't cost
          anything, and it's what let FlareWidget escape to the true
          viewport again. */}
      {/* A keyboard user landing on any page starts at the top of Sidebar's
          full nav list — without this, reaching the actual page content
          means tabbing through every nav link first, on every single
          navigation. Visually hidden until it receives focus (the standard
          skip-link pattern), so sighted mouse users never see it. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-[calc(0.5rem+env(safe-area-inset-top))] focus:left-[calc(0.5rem+env(safe-area-inset-left))] focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
      >
        {t("a11y.skipToContent")}
      </a>
      <div className="relative flex flex-1 min-h-0 w-full mx-auto max-w-[1440px]">
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          onOpenWalletModal={openWalletModal}
        />

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Navbar
            onToggleFlareWidget={toggleFlareWidget}
            setSidebarOpen={setSidebarOpen}
            onOpenWalletModal={openWalletModal}
            hideAskFlareGpt={isFlareGptPage}
          />

          {/* FlareGPT needs a fundamentally different height model than
              every other page, so it gets its own container rather than
              forcing one shared wrapper to serve both: normal pages want
              content-driven height (grow taller than the viewport, let
              `main` scroll the whole page — hence `min-h-full`, which
              means "at least the viewport, but taller if content needs
              it"). A chat UI wants the opposite — a *fixed* viewport-height
              frame where only the message list scrolls internally and the
              composer never moves. Percentage heights (`h-full`) don't
              resolve through a `min-h-full` ancestor: since that ancestor's
              own height is "auto, at least 100%" rather than a definite
              value, a `height: 100%` descendant computes against an
              indefinite containing block and just falls back to sizing to
              its own content instead — which is exactly why FlareGPT's
              internal `h-full` chain silently failed to bound anything
              once a conversation grew past a couple of messages: nothing
              downstream ever had a real height to be "a percentage of", so
              the whole page grew with the transcript and `main` (not the
              message list) became the scrolling element. Giving FlareGPT
              its own `main` with a real `h-full` chain (no `min-`) fixes
              that at the root instead of patching heights further down. */}
          {isFlareGptPage ? (
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2">
              {/* Bottom padding trimmed relative to other pages: Composer
                  already supplies its own bottom padding (including a
                  safe-area inset on mobile), so a full, symmetric `p-6`/
                  `p-4` here would double up and read as an oversized gap
                  beneath the input. Top/bottom trimmed further again at
                  `lg:` specifically — a laptop/desktop viewport has room
                  to spare, and every pixel of padding here is a pixel the
                  message list (the thing actually worth maximizing) isn't
                  getting; mobile and tablet keep the original, more
                  generous values since they're already tighter on space. */}
              <div className="h-full flex flex-col px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3 lg:pt-3 lg:pb-1">
                <PageErrorBoundary pathname={location.pathname} queryClient={queryClient}>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Outlet context={outletContext} />
                  </Suspense>
                </PageErrorBoundary>
              </div>
            </main>
          ) : (
            <main ref={mainScrollRef} id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overscroll-contain scrollbar-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2">
              <div className="flex min-h-full flex-col md:p-6 p-4">
                <div className="flex-1">
                  <PageErrorBoundary pathname={location.pathname} queryClient={queryClient}>
                    <Suspense fallback={<RouteLoadingFallback />}>
                      <Outlet context={outletContext} />
                    </Suspense>
                  </PageErrorBoundary>
                </div>

                <Footer />
              </div>
            </main>
          )}

          {!isFlareGptPage && (
            <FlareWidget
              open={flareWidgetOpen}
              onClose={closeFlareWidget}
              onOpenWalletModal={openWalletModal}
            />
          )}
        </div>
      </div>

      <ConnectWalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </div>
  );
}
