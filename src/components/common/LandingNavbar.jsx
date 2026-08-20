import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { ROUTES } from "@/config/routes";
import FlareGptMark from "@/components/common/FlareGptMark";

const NAV_ITEMS = [
  { label: "Features", id: "features" },
  { label: "AI", id: "ai" },
  { label: "FAQ", id: "faq" },
];

// Hides on scroll-down, reappears immediately on any scroll-up — driven
// entirely through a ref and direct style writes inside a rAF-throttled
// scroll listener, not React state. A per-pixel setState here would
// re-render on every scroll tick; since this nav lives inside the same tree
// as the rest of the (heavy) landing page, that was a real contributor to
// the reported scroll jank. Writing `transform` directly to the DOM node
// keeps this to a single compositor-thread update per frame, independent of
// React's render cycle.
//
// `sticky`, not `fixed` — confirmed live: installed as a home-screen iOS
// PWA specifically (not a regular Safari/Chrome tab, where `fixed` worked
// fine), this nav scrolled away with the page instead of staying pinned.
// That's a long-documented WebKit/WKWebView quirk, not a bug in this
// component's own logic — `position: fixed` inside the standalone/home-
// screen-launched rendering context iOS uses for installed web apps has a
// history of not compositing reliably the way it does in an ordinary
// browser tab, even with the usual mitigations already in place here
// (`will-change-transform`, its own compositing layer). `position: sticky`
// with `top-0` is the standard, well-documented workaround: since this nav
// sits at the very top of the page with nothing above it, it starts
// "stuck" at the first pixel of scroll, visually indistinguishable from
// `fixed` in every context that already worked (desktop, a regular mobile
// browser tab) — but sticky positioning doesn't share `fixed`'s WKWebView
// compositing history, so it holds in the PWA context too. The trade-off:
// unlike `fixed` (removed from flow entirely), a sticky element still
// occupies its own space in normal flow, which is why its own `mb-8
// md:mb-10` below replaces what used to be compensating top padding on
// `<main>` in LandingPage.jsx — that spacing is gone now, this margin is
// what keeps the hero content the same distance below the nav it always
// was.
//
// The *top* offset (the gap above the nav, clearing the status bar/
// Dynamic Island) is `pt-*` (padding), deliberately not `mt-*` (margin) —
// confirmed live, on a real iPhone, not just this file's own Playwright/
// WebKit approximation of one: with margin, the gap rendered correctly at
// the very top of the page (not yet "stuck"), but vanished the moment the
// nav actually became sticky after scrolling — it rendered flush against
// the true viewport top, overlapping the status bar/Dynamic Island,
// looking cut off. That's a real, documented WebKit bug: Safari's sticky-
// positioning implementation doesn't reliably honor a stuck element's
// margin the same way it honors the identical box's margin while still in
// normal flow — the margin can silently drop out once the element is
// actually stuck, even though `top` and padding are still respected.
// Padding doesn't have this gap: it's inside the box sticky positioning
// is already placing, not a separate layer stuck positioning can drop, so
// it renders identically whether the nav is stuck or not. The wrapper
// itself stays background-free (nothing to render in that padding strip
// either way), so this reads identically to the old margin in every case
// that already worked — it just also works in the one case that didn't.
//
// `position: sticky` and the show/hide `transform` are deliberately on
// TWO DIFFERENT elements, not the same one — confirmed live: with both on
// the single `<nav>`, scrolling back up made it reappear only partially
// clipped (its right edge, where the Launch button lives, was cut off and
// unclickable). That's a documented WebKit rendering bug, not a logic
// error: some WebKit versions compute a sticky-positioned element's own
// paint/clip bounds from its *pre-transform* box when a `transform` is
// applied to that same element, especially mid-scroll-direction-reversal
// — the two features fight over the same box's geometry. Splitting them
// resolves it structurally: this outer element owns *only* sticky
// positioning (no transform ever applied to it, so WebKit never has to
// reconcile the two for this box), and the inner <nav> below owns *only*
// the transform (a plain, non-positioned element as far as layout is
// concerned, so its clipping is never computed relative to a sticky
// context). No arbitrary offsets or size changes — this is the same
// visual behavior as before, just with the one WebKit-specific ambiguity
// removed by construction.
//
// The hidden-state transform distance is `calc(-100% - 1rem -
// env(safe-area-inset-top) - 24px)`, not a plain `-120%` — confirmed live,
// specifically on the installed PWA on a Dynamic-Island iPhone (not a
// regular Safari/Chrome tab): scrolling down stopped hiding the nav at
// all, leaving most of it stuck on screen. Unlike the three quirks above,
// this isn't WebKit misrendering — it's this component's own arithmetic.
// `translateY(-120%)` moves the nav up by a fixed 120% of *its own
// height* only, with no relationship to how far down the page the nav
// actually starts. In a regular browser tab, `env(safe-area-inset-top)`
// is 0 (the browser's real chrome — its actual URL bar — occupies that
// space, not this page), so the nav's resting position is just the
// wrapper's `1rem` padding, small enough that clearing the nav's own
// height happened to also clear that. But the installed PWA renders
// edge-to-edge under the status bar/Dynamic Island (see the `pt-*` note
// above), so `env(safe-area-inset-top)` there adds another ~50-59px on
// top of that same `1rem` — distance the fixed `-120%` never knew to
// cover, so it left a growing remainder on screen as the safe-area inset
// grew, roughly the entire nav on a Dynamic-Island device. The fix moves
// the nav up by its own height *plus* the exact `1rem +
// env(safe-area-inset-top)` the wrapper's padding pushed it down by in
// the first place — so the two cancel out regardless of the inset's
// actual value on any given device — plus a small fixed buffer. If the
// wrapper's own top padding below is ever changed, this needs to change
// with it.
const HIDDEN_TRANSFORM =
  "translateY(calc(-100% - 1rem - env(safe-area-inset-top) - 24px))";

export default function LandingNavbar() {
  const navRef = useRef(null);
  const ticking = useRef(false);
  // The extremum scroll position reached since the nav's current
  // hidden/shown state began — the deepest scrollY seen while hidden, the
  // shallowest while shown — continuously updated every frame, not frozen
  // at the last commit point. See updateNav's own comment for why that
  // distinction matters.
  const referenceY = useRef(0);
  const isHidden = useRef(false);

  useEffect(() => {
    referenceY.current = window.scrollY;

    const updateNav = () => {
      ticking.current = false;
      const nav = navRef.current;
      if (!nav) return;

      const currentY = Math.max(0, window.scrollY);

      if (currentY <= 80) {
        nav.style.transform = "translateY(0)";
        isHidden.current = false;
        referenceY.current = currentY;
        return;
      }

      // Reacting to raw frame-to-frame delta (the original approach) isn't
      // robust enough on its own — real touch/momentum scrolling naturally
      // produces individual frames whose delta briefly points the "wrong"
      // way even mid-gesture (deceleration noise, sub-pixel rounding), and
      // reacting to every one of those repeatedly re-triggers the hide
      // transform, restarting its 300ms CSS transition before it can
      // finish. Comparing against a reference point instead of the
      // previous frame absorbs that noise — THRESHOLD px of *sustained*
      // movement in one direction is what actually commits a change, not
      // any single frame's own sign.
      //
      // The reference point itself has to be the *extremum* reached since
      // the last commit — the deepest scrollY while hidden, the shallowest
      // while shown — continuously tracked on every frame that continues
      // in the same direction, not just frozen at wherever the last commit
      // happened. Getting this wrong is a real regression this app already
      // shipped once: freezing the reference at the hide commit point (and
      // only ever updating it again on the *next* commit) meant that
      // scrolling down for a long stretch, then reversing, measured the
      // reversal against wherever hiding *first* triggered — often near
      // the top of the page — instead of against how far down the gesture
      // actually went. That silently reproduced the exact "have to scroll
      // nearly all the way back up before the nav reappears" bug this
      // hysteresis logic exists to fix in the first place, just gated on
      // total distance travelled instead of on jitter. Tracking the
      // extremum continuously (Math.max while hidden, Math.min while
      // shown) means any *reversal* of at least THRESHOLD px — regardless
      // of how far the preceding scroll went — reveals the nav
      // immediately, which is the actual intended behavior: hide on
      // scrolling down, show the moment scrolling up resumes.
      const THRESHOLD = 32;

      if (isHidden.current) {
        referenceY.current = Math.max(referenceY.current, currentY);
        if (referenceY.current - currentY > THRESHOLD) {
          nav.style.transform = "translateY(0)";
          isHidden.current = false;
          referenceY.current = currentY;
        }
      } else {
        referenceY.current = Math.min(referenceY.current, currentY);
        if (currentY - referenceY.current > THRESHOLD) {
          nav.style.transform = HIDDEN_TRANSFORM;
          isHidden.current = true;
          referenceY.current = currentY;
        }
      }
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(updateNav);
      }
    };

    // A backgrounded tab/PWA instance suspends requestAnimationFrame
    // entirely — standard browser behavior, not a bug — so if a scroll
    // event sets `ticking.current = true` right as that happens, the
    // *queued* rAF callback that would normally flip it back to `false`
    // can be dropped instead of merely delayed. Either way, `ticking.current`
    // is then left stuck `true`, which makes onScroll's own guard silently
    // stop scheduling any future frame — the nav freezes in whatever state
    // it was last in and never updates again, even once scrolling resumes
    // normally. Backgrounding (switching apps, locking the screen, a
    // notification pull-down) is routine on mobile/PWA, not an edge case,
    // which is exactly where this reads as "stuck at the top." Resetting
    // both refs the moment the page becomes visible again — re-syncing
    // referenceY to wherever the page actually is now, since scroll
    // position can legitimately change while backgrounded — recovers
    // cleanly instead of leaving the listener permanently wedged.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      ticking.current = false;
      referenceY.current = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="sticky top-0 inset-x-0 z-50 pt-[calc(1rem+env(safe-area-inset-top))] mb-8 md:mb-10">
      <nav
        ref={navRef}
        className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] xl:pl-0 xl:pr-0 transition-transform duration-300 ease-out will-change-transform"
      >
        <div className="mx-auto grid h-[64px] md:h-[72px] w-full max-w-5xl grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-line/70 bg-white/5 dark:bg-white/[0.03] backdrop-blur-md px-3 md:px-4 shadow-lg shadow-black/5 dark:shadow-black/20">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 md:gap-3 select-none justify-self-start rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-lg md:rounded-xl bg-brand/5 blur-md" />

              <FlareGptMark className="relative h-8 w-8 md:h-9 md:w-9 shadow-lg shadow-brand/20" />
            </div>

            <span className="text-sm md:text-base font-black tracking-tight text-ink-primary">
              FlareGPT
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-self-center items-center rounded-full border border-line bg-[#F8FAFC]/80 dark:bg-[#121214]/80 px-2 py-2 backdrop-blur-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="group relative rounded-full px-5 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-brand dark:hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {item.label}

                <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-brand transition-all duration-300 group-hover:w-8" />
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="justify-self-end">
            <Link
              to={ROUTES.app}
              className="group flex items-center gap-1.5 md:gap-2 rounded-full bg-brand px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-[13px] font-semibold text-white transition-all hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
            >
              Launch App
              <ArrowRightIcon className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
