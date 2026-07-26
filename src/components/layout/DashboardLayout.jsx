import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useRef, useState } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FlareWidget from "@/components/common/FlareWidget";
import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useWalletActivityNotifier } from "@/hooks/useWalletActivityNotifier";

// GlobalSpinner is h-screen, which is correct for AppRoutes' top-level
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

export default function DashboardLayout() {
  // Connecting a wallet anywhere in the app shell doubles as signing in.
  useAuthSync();
  // R15: keeps watching a large wallet's activity fetch even after the
  // page that started it unmounts — see the hook for why.
  useWalletActivityNotifier();

  const location = useLocation();
  const navigate = useNavigate();
  // The floating "Ask FlareGPT" entry points exist so the assistant is
  // reachable from any *other* page — tapping "Ask FlareGPT" while
  // already on the dedicated FlareGPT page would be a redundant, slightly
  // confusing affordance pointing at the thing you're already looking at.
  const isFlareGptPage = location.pathname.startsWith("/app/flare-gpt");

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
  const openWalletModal = () => setWalletModalOpen(true);

  return (
    <div className="h-dvh overflow-hidden bg-[#F0F4F9] dark:bg-[#101115]">
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
      <div className="relative flex h-full mx-auto max-w-[1440px]">
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
            <main className="flex-1 overflow-hidden">
              {/* Bottom padding trimmed relative to other pages: Composer
                  already supplies its own bottom padding (including a
                  safe-area inset on mobile), so a full, symmetric `p-6`/
                  `p-4` here would double up and read as an oversized gap
                  beneath the input. */}
              <div className="h-full flex flex-col px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Outlet context={{ openWalletModal }} />
                </Suspense>
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto overscroll-contain">
              <div className="flex min-h-full flex-col md:p-6 p-4">
                <div className="flex-1">
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Outlet context={{ openWalletModal }} />
                  </Suspense>
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
