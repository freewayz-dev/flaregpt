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
export default function LandingNavbar() {
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const updateNav = () => {
      ticking.current = false;
      const nav = navRef.current;
      if (!nav) return;

      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY <= 80 || delta < -4) {
        nav.style.transform = "translateY(0)";
      } else if (delta > 4) {
        nav.style.transform = "translateY(-120%)";
      }

      lastScrollY.current = currentY;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(updateNav);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 inset-x-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] xl:pl-0 xl:pr-0 transition-transform duration-300 ease-out will-change-transform"
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
  );
}
