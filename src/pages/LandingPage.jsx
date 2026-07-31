import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import {
  ArrowRightIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  CheckIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  RocketLaunchIcon,
  EyeIcon,
  WalletIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  HeartIcon,
  BoltIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

import { FadeIn } from "@/components/common/MotionWrapper";
import LandingAIDemo from "@/components/common/LandingAIDemo";
import LandingNavbar from "@/components/common/LandingNavbar";
import ConnectWalletModal from "@/components/common/ConnectWalletModal";
import { useUIStore } from "@/store/useUIStore";
import { shortenAddress } from "@/utils/address";
import { ROUTES } from "@/config/routes";

import flareLogo from "@/assets/icons/fl.png";
import openLogo from "@/assets/icons/image.png";
import walletConnectLogo from "@/assets/wallets/icon.png";
import claudeLogo from "@/assets/icons/claude-logo.png";
import overviewLight from "@/assets/showcase/overview-light.png";
import overviewDark from "@/assets/showcase/overview-dark.png";
import defiLight from "@/assets/showcase/defi-light.png";
import defiDark from "@/assets/showcase/defi-dark.png";

export default function LandingPage() {
  const [open, setOpen] = useState(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const navigate = useNavigate();
  const darkMode = useUIStore((s) => s.darkMode);
  const { address, isConnected } = useConnection();

  // Wallet connection doubles as sign-in app-wide (see useAuthSync), so
  // completing it *from the landing page specifically* should carry
  // through to the destination that implies, rather than leaving the
  // visitor sitting on the marketing page next to a now-pointless
  // "Connect Wallet" button. The ref is armed only while a connection
  // attempt started here is actually in flight, so it can't fire from an
  // unrelated connection event (e.g. another tab) and can't fire from
  // already being connected on mount (handled separately by the button's
  // own label below, not a redirect).
  //
  // `closeWalletModal` only clears the flag when *not yet* connected —
  // ConnectWalletModal auto-closes itself the instant `isConnected` flips
  // true, and as the child, its effect runs before this component's own
  // effect below in the same commit. Clearing the flag unconditionally
  // here would race that auto-close and clear it before the effect ever
  // gets to read it, silently killing the redirect. Only a genuine
  // cancel (closing while still disconnected) resets it.
  const awaitingConnectRef = useRef(false);

  // Built from the same `faqs` array the accordion below actually renders,
  // not a separately-maintained copy — editing a question/answer only
  // needs to happen in one place and this stays truthful to what's really
  // on the page. Google explicitly supports structured data injected by JS
  // after render (unlike the static OG/Twitter tags in index.html, which
  // exist because *other* crawlers don't run JS at all), so there's no
  // real cost to keeping this here instead of duplicating the content
  // statically.
  const faqJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    }),
    [],
  );

  const openWalletModal = () => {
    awaitingConnectRef.current = true;
    setWalletModalOpen(true);
  };

  const closeWalletModal = () => {
    if (!isConnected) {
      awaitingConnectRef.current = false;
    }
    setWalletModalOpen(false);
  };

  useEffect(() => {
    if (isConnected && awaitingConnectRef.current) {
      awaitingConnectRef.current = false;
      navigate(ROUTES.app);
    }
  }, [isConnected, navigate]);

  // Warm the Dashboard route's JS chunk while the visitor is still reading
  // the landing page, so clicking "Launch App" doesn't have to wait for a
  // fresh network fetch + parse of that chunk on top of the route
  // transition itself. Deferred with requestIdleCallback so it never
  // competes with the landing page's own first paint for the main thread.
  useEffect(() => {
    const prefetch = () => import("@/pages/Dashboard");
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-dvh bg-[#F0F4F9] dark:bg-[#101115] transition-colors duration-300">
      {/* Grid + ambient glow layer is scoped to this wrapper (nav + main
          only), not the whole page, and fades out over its last 15% via the
          mask below — so it never shows through behind the footer, which
          has its own (near-transparent) background that's meant to read as
          "the grid has ended" rather than have the grid bleed through it. */}
      <div className="relative overflow-x-hidden">
        {/* All ambient glows sit at z-0, and the grid sits at z-[5] — above
            every glow, below all real content (main is z-10). That ordering
            is what makes the grid read consistently everywhere, including
            the hero: previously the hero glow was z-30 (above the grid),
            so it visually washed the grid out only in that one section. */}
        <div className="absolute top-44 sm:top-52 left-1/2 -translate-x-1/2 w-[300px] h-[300px] sm:w-[550px] sm:h-[550px] bg-brand/10 dark:bg-brand/8 blur-[70px] sm:blur-[110px] rounded-full pointer-events-none z-0" />

        {/* Three more subtle glows staggered down the page (roughly the AI,
            features, and FAQ sections) and offset left/right of center, so
            the ambient brand-color wash keeps a continuous, organic presence
            as the user scrolls instead of only bookending the hero and the
            CTA section further down. Each one is modest on its own — the
            "flowing" effect comes from spacing them out, not from any single
            glow being prominent. */}
        <div className="absolute top-[22%] left-[35%] -translate-x-1/2 w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] bg-brand/12 dark:bg-brand/10 blur-[90px] sm:blur-[110px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-[48%] left-[65%] -translate-x-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-brand/12 dark:bg-brand/10 blur-[90px] sm:blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-[72%] left-[35%] -translate-x-1/2 w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] bg-brand/12 dark:bg-brand/10 blur-[80px] sm:blur-[100px] rounded-full pointer-events-none z-0" />

        {/* Grid pattern sits above every glow (z-[5]) so it reads at the
            same strength everywhere the glows pass behind it, including the
            hero — and still below all real content (main is z-10).
            Two nested masks (rather than one combined gradient) so the
            vertical and horizontal fades multiply correctly: the outer div
            fades the top (blending into the navbar) and bottom (fading out
            before the footer); the inner div fades the left/right edges so
            the grid doesn't end with a hard vertical line at the viewport
            boundary. (There used to be a radial vignette mask here instead —
            centered at 50% of the *entire* page height, which faded out both
            the hero and the CTA section at once, leaving only the vertical
            middle of the page at full strength. Removed rather than
            re-tuned, since a vignette anchored to total page height drifts
            out of sync as content is added.) */}
        <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,#000_5%,#000_92%,transparent_100%)]">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent_0%,#000_6%,#000_94%,transparent_100%)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1.5px,transparent_1.5px),linear-gradient(to_bottom,#e2e8f0_1.5px,transparent_1.5px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-45 dark:opacity-25" />
          </div>
        </div>

        <LandingNavbar />

        <main className="relative z-10 pt-24 md:pt-28">
        <FadeIn>
          <section className="flex flex-col items-center px-4 xl:px-0 justify-center text-center max-w-5xl mx-auto pt-20 md:pt-28 pb-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-[#FFFFFF]/80 dark:bg-[#161619]/80 backdrop-blur-xl px-4 py-1.5 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-secondary">
                Built for the Flare Network
              </span>
            </div>

            <h1 className="mt-7 max-w-3xl font-display text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight text-ink-primary select-none">
              Everything{" "}
              <span className="bg-gradient-to-r from-brand to-brand-hover bg-clip-text text-transparent">
                Flare.
              </span>
              <br />
              Simplified.
            </h1>

            <p className="mt-7 max-w-xl text-sm sm:text-sm md:leading-8 leading-6 text-ink-secondary">
              Track wallets, automate reward claiming, receive gas fee alerts,
              monitor governance, and chat with an AI that understands your
              Flare portfolio, all from one intelligent platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-5">
              <Link
                to={ROUTES.app}
                className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/20 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                Launch App
              </Link>

              <button
                type="button"
                onClick={() => (isConnected ? navigate(ROUTES.app) : openWalletModal())}
                className="group flex items-center gap-2 text-sm font-semibold text-ink-primary transition-colors hover:text-brand dark:hover:text-brand-hover cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              >
                {isConnected ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Continue as {shortenAddress(address)}
                  </>
                ) : (
                  "Connect Wallet"
                )}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Non-custodial trust signal — previously only mentioned inside
                a collapsed FAQ answer nobody may ever open. Surfaced here,
                right beside the CTAs, since custody is a primary anxiety
                for exactly the audience landing on a wallet-connected
                product, not a footnote to bury. */}
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-[#FFFFFF]/60 dark:bg-[#161619]/60 backdrop-blur-md px-4 py-1.5">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-medium text-ink-secondary">
                Non-custodial. FlareGPT never holds or moves your funds.
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-[10px] text-ink-muted">
              {[
                "No wallet required",
                "Supports multiple wallets",
                "Powered by live Flare data",
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  <span>{item}</span>

                  {index !== 2 && (
                    <span className="hidden sm:block ml-2 text-[#CBD5E1] dark:text-[#3F3F46]">
                      •
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.2}>
          <section className="relative w-full py-8">
            {/* Solid, opaque surface rather than the near-transparent
                bg-white/5 this used to be — that was translucent enough
                that the page's own background grid (positioned behind
                `main` but visually showing through anything not fully
                opaque) bled through it. `bg-surface-card` (the same
                elevated-card token feature/FAQ cards use) rather than a
                flat match of the page background, so this reads as its
                own distinct surface instead of just a gap in the grid. */}
            <div className="relative w-full border-y border-line/70 bg-surface-card">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line/60">
                  {[
                    {
                      value: "1.42M",
                      suffix: "FLR",
                      title: "Rewards Tracked",
                    },
                    {
                      value: "4,321",
                      title: "Wallets Monitored",
                    },
                    {
                      value: "167",
                      title: "FTSO Providers",
                    },
                    {
                      value: "98.7%",
                      title: "Network Health",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="px-6 py-4 text-center transition-colors hover:bg-brand/5 lg:py-8"
                    >
                      <div className="text-2xl font-black tracking-tight text-ink-primary sm:text-3xl">
                        {item.value}

                        {item.suffix && (
                          <span className="ml-1 text-sm font-bold text-brand">
                            {item.suffix}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#A1A1AA]">
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* AI SECTION */}
        <FadeIn delay={0.2}>
          <section
            id="ai"
            className="overflow-x-hidden px-4 pt-10 xl:px-0 lg:pt-28"
          >
            <div className="mx-auto max-w-5xl">
              {/* `items-start`, not `items-center`: the demo card has no
                  badge above it at desktop, so centering by each column's
                  *total* height still left the copy's badge/heading
                  starting well below the demo card's own top edge — two
                  boxes correctly centered on each other, but their actual
                  content starting at visibly different points. Top-
                  aligning both columns' boxes is what actually makes them
                  read as sharing a common start. */}
              <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-20">
                {/* Demo stays first on mobile (shown before any explanation
                    — this product's most differentiating asset gets seen
                    first when scrolling top-to-bottom) but moves to the
                    right column on desktop via `lg:order-2`, with copy
                    taking the left. `lg:pr-20` (was `lg:pl-20` when this
                    was the left column) now pulls it inward from its new
                    right edge instead. */}
                <div className="order-1 flex flex-col items-center lg:order-2 lg:pr-20">
                  {/* Mobile Badge */}
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-md dark:bg-[#161619]/80 lg:hidden">
                    <SparklesIcon className="h-3.5 w-3.5 text-brand" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                      AI Assistant
                    </span>
                  </div>

                  <LandingAIDemo onOpenWalletModal={openWalletModal} />
                </div>

                {/* Content — now the left column on desktop (`lg:order-1`),
                    so its `lg:pl-*` (was `lg:pr-20`) pulls inward from its
                    new left edge, mirroring the demo's own inward pull. */}
                <FadeIn className="order-2 text-center lg:order-1 lg:text-left">
                  <div>
                    {/* Desktop Badge */}
                    <div className="lg:pl-20">
                      <div className="hidden lg:inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-md dark:bg-[#161619]/80">
                        <SparklesIcon className="h-3.5 w-3.5 text-brand" />

                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                          AI Assistant
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-6 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white lg:pl-20">
                      Your smartest guide to
                      <span className="block">everything in your wallet.</span>
                    </h2>

                    <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-ink-secondary lg:mx-0 lg:pl-20">
                      Connect one or multiple wallets and FlareGPT instantly
                      understands your balances, rewards, governance activity,
                      delegation and staking position. Ask questions naturally
                      instead of searching through dashboards.
                    </p>

                    <div className="mt-10 flex justify-center lg:block lg:pl-20">
                      <div className="inline-flex flex-col items-start gap-3 lg:flex">
                        {[
                          "Understands every connected wallet.",
                          "Explains rewards in plain English.",
                          "Finds rewards ready to claim.",
                          "Alerts you when gas fees are low.",
                          "Answers any Flare question instantly.",
                        ].map((item) => (
                          <div key={item} className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10">
                              <CheckIcon className="h-3.5 w-3.5 text-brand" />
                            </div>

                            <p className="text-left text-sm text-ink-secondary">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.2}>
          <section
            id="features"
            className="w-full max-w-5xl mx-auto md:pt-32 pt-28 px-4 xl:px-0"
          >
            <FadeIn>
              <div className="mb-10 text-center max-w-2xl mx-auto">
                <h2 className="font-display max-w-xl pt-4 mx-auto text-2xl sm:text-3xl font-semibold tracking-tight text-ink-primary">
                  One dashboard for the whole
                  <br />
                  <span className="text-brand">Flare</span> ecosystem.
                </h2>

                <p className="mt-4 max-w-xl mx-auto text-sm leading-6 text-ink-secondary">
                  Manage wallets, automate reward claiming, participate in
                  governance, and get AI-powered insights, all from one place.
                </p>
              </div>
            </FadeIn>

            {/* Real product screenshots — the feature grid below makes five
                claims (wallet tracking, rewards, governance, live data,
                alerts) in text alone; these give at least the two most
                data-dense of them actual visual proof, the way Stripe/
                Vercel-tier product pages always show real UI rather than
                icon-plus-paragraph cards only.

                Theme-matched to whichever mode the visitor is currently
                in, rather than a fixed pair — a light-mode screenshot
                inside a dark-mode page reads as a stray bright rectangle,
                not a deliberate choice, and undercuts the sense that dark
                mode was actually designed for rather than just supported.
                A deliberate "show both themes at once" composition could
                work too, but only if explicitly framed as demonstrating
                theme support (its own caption, side-by-side by design) —
                doing it implicitly here would just read as an oversight. */}
            <FadeIn className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                { src: darkMode ? overviewDark : overviewLight, alt: "FlareGPT dashboard overview showing live FLR price and network stats", caption: "Live network data, always current" },
                { src: darkMode ? defiDark : defiLight, alt: "FlareGPT DeFi protocol comparison showing yield strategies across Sceptre, Firelight, and MXRPY", caption: "Compare yield strategies at a glance" },
              ].map((shot) => (
                <div
                  key={shot.caption}
                  className="overflow-hidden rounded-2xl border-2 border-brand/30 bg-surface-card shadow-sm"
                >
                  <div className="overflow-hidden border-b border-brand/30">
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      width={1200}
                      height={682}
                      className="w-full aspect-[1200/682] object-cover object-top"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="px-5 py-3.5 text-[13px] font-medium text-ink-secondary">
                    {shot.caption}
                  </p>
                </div>
              ))}
            </FadeIn>

            {/* Gas Sniper gets its own featured treatment rather than
                sitting as one more equal-weight card in the grid below —
                it's the other genuine differentiator alongside FlareGPT
                (which already gets a full dedicated section above), and a
                plain icon+paragraph card undersold that. Larger padding,
                a two-column internal layout, and a tinted/bordered
                surface distinguish it from the regular grid without
                introducing a visual language foreign to the rest of the
                page — same rounded-2xl/border/brand-accent vocabulary,
                same checklist-bullet pattern the AI section above uses. */}
            <FadeIn className="mb-5">
              <div className="relative overflow-hidden rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-brand/[0.07] via-surface-card to-surface-card p-6 sm:p-8">
                <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                      <BoltIcon className="h-3 w-3" />
                      Flagship automation
                    </div>

                    <h3 className="mt-4 font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink-primary">
                      Gas Sniper
                    </h3>

                    <p className="mt-1 text-sm font-medium text-ink-secondary">
                      Your FTSO rewards, claimed for you
                    </p>

                    <p className="mt-4 max-w-md text-sm leading-7 text-ink-secondary">
                      Turn it on once and forget about it. Gas Sniper watches
                      network conditions around the clock and claims your
                      FTSO rewards the moment it's actually worth doing, so
                      you never have to time it yourself.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      "Automatically claims your FTSO rewards — no manual action needed",
                      "Runs continuously in the background, 24/7",
                      "Claims only when gas fees make it worth it",
                      "Gives you back the time you'd spend watching the network",
                      "Built natively into the Flare ecosystem, no third-party tools",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10">
                          <CheckIcon className="h-3.5 w-3.5 text-brand" />
                        </div>
                        <p className="text-left text-sm text-ink-secondary">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <FadeIn key={idx} delay={idx * 0.1} className="h-full">
                    <div
                      key={idx}
                      className="h-full group rounded-2xl border border-line bg-surface-card p-6 transition-all duration-300 hover:border-brand/20 hover:-translate-y-1"
                    >
                      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle transition-colors group-hover:bg-brand/10">
                        <Icon className="h-5 w-5 text-ink-secondary group-hover:text-brand" />
                      </div>

                      <h3 className="text-sm font-semibold text-ink-primary">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-[13px] text-ink-muted">
                        {item.subtitle}
                      </p>

                      <p className="mt-5 text-sm leading-7 text-ink-secondary">
                        {item.desc}
                      </p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </section>
        </FadeIn>

        {/* HOW IT WORKS */}
        <FadeIn delay={0.2}>
          <section className="w-full max-w-5xl mx-auto pt-28 md:pt-32 px-4 xl:px-0">
            <div className="mb-14 text-center max-w-xl mx-auto">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink-primary">
                From zero to insights in minutes.
              </h2>
              <p className="mt-4 text-sm leading-6 text-ink-secondary">
                No signup, no wallet required to start. Connect one whenever
                you're ready for personalized answers.
              </p>
            </div>

            {/* Below `lg`, five full-width stacked blocks read as a wall of
                text rather than a quick sequence — a connected vertical
                timeline keeps every step visible at a glance (unlike a
                swipeable carousel, which trades scannability for novelty)
                while still giving the section a considered visual device
                instead of plain stacked cards. Each connector is sized by
                flex-1 within its own row rather than one absolutely-
                positioned line spanning the whole list, so it self-adjusts
                to whatever height that step's description actually needs
                instead of assuming every step is the same height. */}
            <div className="space-y-0 lg:hidden">
              {howItWorks.map((step, idx) => {
                const Icon = step.icon;
                const isLast = idx === howItWorks.length - 1;
                return (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-card shadow-sm">
                        <Icon className="h-5 w-5 text-brand" />
                      </div>
                      {!isLast && <div className="my-2 w-px flex-1 bg-line" />}
                    </div>
                    <div className={isLast ? "pb-1" : "pb-8"}>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Step {idx + 1}
                      </span>
                      <h3 className="mt-1 text-sm font-semibold text-ink-primary">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-6 text-ink-secondary">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop keeps the horizontal row with its own connecting
                line — unrelated to the mobile timeline above, not a
                responsive reflow of the same markup. */}
            <div className="relative hidden lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="pointer-events-none absolute top-6 left-[10%] right-[10%] h-px bg-line" />

              {howItWorks.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative flex flex-col items-center text-center">
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-card shadow-sm">
                        <Icon className="h-5 w-5 text-brand" />
                      </div>
                      <span className="mt-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Step {idx + 1}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-ink-primary">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-[200px] text-[13px] leading-6 text-ink-secondary">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.2}>
          <section id="faq" className="pt-28 md:pt-32 px-4 xl:px-0">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className="max-w-3xl mx-auto">
              {/* Header */}

              <div className="text-center">
                <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
                  Frequently asked
                  <span className="block">questions.</span>
                </h2>

                <p className="mt-5 text-sm leading-7 text-ink-secondary">
                  Everything you need to know about FlareGPT before you get
                  started.
                </p>
              </div>

              {/* Accordion */}

              <div className="mt-10 space-y-3">
                {faqs.map((item, index) => {
                  const isOpen = open === index;
                  const panelId = `faq-panel-${index}`;

                  return (
                    <div
                      key={item.q}
                      className="rounded-2xl border border-line bg-white/90 dark:bg-[#191A1F] overflow-hidden"
                    >
                      {/* Question */}

                      <button
                        onClick={() => setOpen(isOpen ? null : index)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="w-full flex items-center justify-between px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:-outline-offset-2"
                      >
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {item.q}
                        </span>

                        <ChevronDownIcon
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 text-[#71717A] transition-transform duration-300 ${
 isOpen ? "rotate-180" : ""
 }`}
                        />
                      </button>

                      {/* Answer — a CSS grid-template-rows transition
                          (0fr -> 1fr) instead of framer-motion's
                          height:"auto" animation, which needs to mount and
                          measure the content's natural height before it
                          can animate to it. Measuring actual click-to-
                          motion timing showed both techniques share the
                          same ~40ms gap before anything visibly moves —
                          that's ordinary React render/paint latency, not
                          specific to either animation approach, and well
                          under the ~100ms threshold where a delay reads as
                          sluggish. The real, controllable lever turned out
                          to be total duration, not the technique: this was
                          shortened from 250ms to 180ms so the whole open/
                          close completes noticeably faster. Kept as CSS
                          rather than reverted to framer-motion anyway,
                          since it drops this page's last framer-motion
                          dependency for a technique that needs no JS
                          measurement step at all. */}
                      <div
                        id={panelId}
                        aria-hidden={!isOpen}
                        className="grid transition-[grid-template-rows] duration-[180ms] ease-in-out"
                        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div
                            className={`px-5 pb-5 text-sm leading-6 text-[#64748B] dark:text-[#A1A1AA] transition-opacity duration-150 ${
                              isOpen ? "opacity-100 delay-75" : "opacity-0"
                            }`}
                          >
                            {item.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.3}>
          <section className="w-full max-w-5xl mx-auto pt-36 md:pt-40 md:pb-28 pb-32 text-center px-4 xl:px-0">
            <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[#FFFFFF] to-[#F3F4F6] dark:from-[#161619] dark:to-[#121214] p-6 sm:p-16 shadow-xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand/10 dark:bg-brand/5 blur-[80px] rounded-full pointer-events-none" />

              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-primary max-w-lg mx-auto leading-tight">
                Everything you need to manage
                <span className="block">your Flare portfolio.</span>
              </h2>


              <p className="mt-5 max-w-md mx-auto text-sm leading-7 text-ink-secondary">
                Access FlareGPT, monitor rewards, participate in governance,
                track your wallets, and explore the Flare ecosystem, all from
                one dashboard.
              </p>


              <div className="relative z-10 mt-10 flex flex-col items-center gap-5">
                <Link
                  to={ROUTES.app}
                  className="rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-brand-hover shadow-lg shadow-brand/20 hover:shadow-brand/30 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  Launch App
                </Link>


                <p className="mt-2 text-[11px] text-ink-muted">
                  Secure wallet connection • Setup guide included • No
                  installation required
                </p>
              </div>
            </div>
          </section>
        </FadeIn>
      </main>
      </div>

      <FadeIn delay={0.3}>
        <footer className="relative w-full border-t border-line/70 bg-white/5 dark:bg-white/[0.03] backdrop-blur-md">
          <div className="mx-auto max-w-5xl py-12 px-4 xl:px-0">
            {/* Ecosystem */}
            <div className="flex flex-col items-center gap-8 pb-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#64748B] dark:text-[#A1A1AA]">
                Built with industry-leading technologies
              </p>

              {/* Mobile */}
              <div className="flex w-full items-start justify-between md:hidden">
                {EcosystemPartners.map((partner) => (
                  <div
                    key={partner.name}
                    className="flex w-16 flex-col items-center gap-2"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white dark:bg-[#161619]">
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="h-6 w-6 rounded-full object-contain"
                      />
                    </div>

                    <span className="text-center text-[9px] font-semibold leading-tight text-[#64748B] dark:text-[#A1A1AA]">
                      {partner.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden flex-wrap items-center justify-center gap-4 md:flex">
                {EcosystemPartners.map((partner) => (
                  <div
                    key={partner.name}
                    className="group flex h-11 items-center gap-3 rounded-xl border border-white/25 bg-white/25 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all hover:border-brand/40 hover:bg-brand/10 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                  >
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="h-6 w-6 rounded-full object-contain transition-transform duration-200 group-hover:scale-110"
                    />

                    <span className="text-[11px] font-bold text-ink-secondary transition-colors group-hover:text-[#0F172A] dark:group-hover:text-white">
                      {partner.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-line/70 pt-10">
              <div className="grid gap-8 sm:grid-cols-2">
                {/* Brand */}
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-brand/5 blur-md" />

                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/20">
                      <span className="text-sm font-black tracking-tight text-white">
                        F
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-black tracking-tight text-[#0F172A] dark:text-white">
                      FlareGPT
                    </p>

                    <p className="font-mono text-[10px] font-medium text-[#64748B] dark:text-[#A1A1AA]">
                      © 2026 All Rights Reserved
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 font-mono text-[11px] font-bold text-[#64748B] dark:text-[#A1A1AA] sm:justify-end">
                  <Link
                    to={ROUTES.app}
                    className="rounded transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                  >
                    Launch App
                  </Link>

                  <Link
                    to={ROUTES.terms}
                    className="rounded transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                  >
                    Terms
                  </Link>

                  <Link
                    to={ROUTES.donate}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-brand transition-all hover:bg-brand hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                  >
                    Donate
                    <HeartIcon className="h-3 w-3" />
                  </Link>

                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="X (formerly Twitter)"
                    className="rounded transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </FadeIn>

      <ConnectWalletModal isOpen={walletModalOpen} onClose={closeWalletModal} />
    </div>
  );
}

const howItWorks = [
  {
    icon: RocketLaunchIcon,
    title: "Launch the app",
    desc: "No signup, no install. Open the dashboard straight from your browser.",
  },
  {
    icon: EyeIcon,
    title: "Explore instantly",
    desc: "Browse live network data, protocols, and rewards before connecting anything.",
  },
  {
    icon: WalletIcon,
    title: "Connect a wallet",
    desc: "Add one or several, anytime. Nothing is required up front.",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: "Ask FlareGPT",
    desc: "Get plain-English answers about your balances, rewards, and activity.",
  },
  {
    icon: GiftIcon,
    title: "Automate your rewards",
    desc: "Turn on Gas Sniper to claim FTSO rewards automatically, or manage delegations yourself.",
  },
];

const features = [
  {
    id: "01",
    icon: CpuChipIcon,
    title: "Personal AI Assistant",
    subtitle: "Ask anything about your wallets",
    desc: "Chat with an AI that understands the Flare ecosystem. Analyze your portfolio, explain transactions, discover opportunities, and get answers tailored to the wallets you choose to track.",
  },
  {
    id: "02",
    icon: CircleStackIcon,
    title: "Multi-Wallet Tracking",
    subtitle: "Monitor everything in one place",
    desc: "Add one or multiple wallets to track balances, holdings, rewards, and activity from a single dashboard. No more switching between explorers or tools.",
  },
  {
    id: "03",
    icon: ArrowTrendingUpIcon,
    title: "Rewards & Delegations",
    subtitle: "See exactly where you stand",
    desc: "Track accruing FTSO rewards, delegation weight across providers, and unclaimed balances — while Gas Sniper handles the claiming automatically.",
  },
  {
    id: "04",
    icon: Square3Stack3DIcon,
    title: "Smart Alerts",
    subtitle: "Be notified at the right time",
    desc: "Receive alerts for low gas fees, reward opportunities, wallet activity, and important ecosystem events so you never miss what matters.",
  },
  {
    id: "05",
    icon: BanknotesIcon,
    title: "DeFi Yield Strategies",
    subtitle: "Compare protocols side by side",
    desc: "Compare deposit strategies across Sceptre, Firelight, MXRPY, and Spectra — APRs, terms, and payouts side by side, so you can choose with confidence.",
  },
  {
    id: "06",
    icon: ClockIcon,
    title: "rFLR Vesting Tracker",
    subtitle: "Know exactly when it unlocks",
    desc: "Follow your rFLR vesting schedule, upcoming unlocks, and early-exit terms alongside live network-wide emission data.",
  },
];

const faqs = [
  {
    q: "What is FlareGPT?",
    a: "FlareGPT is an AI layer that connects to your wallets and turns on-chain data into simple, actionable insights in real time.",
  },

  {
    q: "Is FlareGPT custodial?",
    a: "No. FlareGPT is fully non-custodial. It can read your wallet data but never holds or moves your funds.",
  },

  {
    q: "Which wallets and networks are supported?",
    a: "FlareGPT works with major Web3 wallets and is built primarily for the Flare ecosystem, with more integrations being added over time.",
  },

  {
    q: "Do I need multiple wallets to use it?",
    a: "No. You can connect a single wallet or multiple wallets. FlareGPT aggregates everything into one unified view.",
  },

  {
    q: "How does FlareGPT use my data?",
    a: "Your data is used only to generate insights and responses. Nothing is sold, shared, or used outside your session context.",
  },

  {
    q: "Can FlareGPT execute transactions?",
    a: "Not directly. It can guide you and prepare recommendations, but all actions must be confirmed by you in your wallet.",
  },
];

const EcosystemPartners = [
  {
    name: "Flare",
    logo: flareLogo,
  },
  {
    name: "OpenAI",
    logo: openLogo,
  },
  {
    name: "WalletConnect",
    logo: walletConnectLogo,
  },

  {
    name: "Claude",
    logo: claudeLogo,
  },
];
