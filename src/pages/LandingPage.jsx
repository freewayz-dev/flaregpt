import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckIcon } from "lucide-react";
import {
  ArrowRightIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

import { FadeIn } from "@/components/common/MotionWrapper";
import AIPhoneMockup from "@/components/common/AIPhoneMockup";
import LandingNavbar from "@/components/common/LandingNavbar";

import flareLogo from "@/assets/icons/fl.png";
import openLogo from "@/assets/icons/image.png";
import walletConnectLogo from "@/assets/wallets/icon.png";
import bifrostLogo from "@/assets/wallets/bifrost.jpeg";

export default function LandingPage() {
  const [open, setOpen] = useState(null);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#F0F4F9] dark:bg-[#101115] transition-colors duration-300">
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

        <main className="relative z-10 pt-20 md:pt-24">
        <FadeIn>
          <section className="flex flex-col items-center px-4 xl:px-0 justify-center text-center max-w-5xl mx-auto pt-12 md:pt-16 pb-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-[#FFFFFF]/80 dark:bg-[#161619]/80 backdrop-blur-xl px-4 py-1.5 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-secondary">
                Built for the Flare Network
              </span>
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-ink-primary select-none">
              Everything{" "}
              <span className="bg-gradient-to-r from-brand to-brand-hover bg-clip-text text-transparent">
                Flare.
              </span>
              <br />
              Simplified.
            </h1>

            <p className="mt-7 max-w-xl text-sm sm:text-sm md:leading-8 leading-6 text-ink-secondary">
              Track wallets, claim rewards at the right time, receive gas fee
              alerts, monitor governance, and chat with an AI that understands
              your Flare portfolio, all from one intelligent platform.
            </p>

            <p className="mt-5 max-w-md text-xs sm:text-xs md:leading-7 leading-6 text-ink-muted">
              Start exploring instantly without connecting a wallet. Add one or
              multiple wallets anytime to unlock personalized AI insights,
              portfolio analysis, reward tracking, and wallet-specific
              recommendations.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-5">
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/20 cursor-pointer"
              >
                Launch App
              </button>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("ai")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="group flex items-center gap-2 text-sm font-semibold text-ink-primary transition-colors hover:text-brand dark:hover:text-brand-hover cursor-pointer"
              >
                Connect Wallet
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            <div className="mt-20 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-[10px] text-ink-muted">
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
            <div className="relative w-full border-y border-line/70 bg-white/5 dark:bg-white/[0.03] backdrop-blur-md">
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

                      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#71717A]">
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
              <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-20">
                {/* Phone - Mobile First */}
                <div className="order-1 flex flex-col items-center lg:order-2">
                  {/* Mobile Badge */}
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-md dark:bg-[#161619]/80 lg:hidden">
                    <SparklesIcon className="h-3.5 w-3.5 text-brand" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                      AI Assistant
                    </span>
                  </div>

                  <AIPhoneMockup />
                </div>

                {/* Content */}
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

                    <h2 className="mt-6 text-2xl font-black tracking-tight text-[#0F172A] dark:text-white lg:pl-20">
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
                <h2 className="text-2xl font-black max-w-xl pt-4 mx-auto tracking-tight text-ink-primary">
                  Everything you need for
                  <br />
                  the <span className="text-brand">flare</span> ecosystem.
                </h2>

                <p className="mt-4 max-w-xl mx-auto text-sm leading-6 text-ink-secondary">
                  Manage wallets, claim rewards, participate in governance, and
                  get AI-powered insights, all from one place.
                </p>
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

        <FadeIn delay={0.2}>
          <section id="faq" className="pt-32 px-4 xl:px-0">
            <div className="max-w-3xl mx-auto">
              {/* Header */}

              <div className="text-center">
                <h2 className="text-2xl font-black tracking-tight text-[#0F172A] dark:text-white">
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

                  return (
                    <div
                      key={item.q}
                      className="rounded-2xl border border-line bg-white/70 dark:bg-[#191A1F] backdrop-blur-xl overflow-hidden"
                    >
                      {/* Question */}

                      <button
                        onClick={() => setOpen(isOpen ? null : index)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {item.q}
                        </span>

                        <ChevronDownIcon
                          className={`h-4 w-4 text-[#71717A] transition-transform duration-300 ${
 isOpen ? "rotate-180" : ""
 }`}
                        />
                      </button>

                      {/* Answer (animated) */}

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.25,

                              ease: "easeInOut",
                            }}
                            className="px-5 overflow-hidden"
                          >
                            <div className="pb-5 text-sm leading-6 text-[#64748B] dark:text-[#A1A1AA]">
                              {item.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.3}>
          <section className="w-full max-w-5xl mx-auto pt-48 md:pb-28 pb-32 text-center px-4 xl:px-0">
            <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[#FFFFFF] to-[#F3F4F6] dark:from-[#161619] dark:to-[#121214] p-6 sm:p-16 shadow-xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand/10 dark:bg-brand/5 blur-[80px] rounded-full pointer-events-none" />

              <h2 className="mt-3 text-3xl font-black tracking-tight text-ink-primary max-w-lg mx-auto leading-tight">
                Everything you need to manage
                <span className="block">your Flare portfolio.</span>
              </h2>


              <p className="mt-5 max-w-md mx-auto text-sm leading-7 text-ink-secondary">
                Access FlareGPT, monitor rewards, participate in governance,
                track your wallets, and explore the Flare ecosystem, all from
                one dashboard.
              </p>


              <div className="relative z-10 mt-10 flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-brand-hover shadow-lg shadow-brand/20 hover:shadow-brand/30 active:scale-[0.98]"
                >
                  Open Dashboard
                </button>


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
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#64748B] dark:text-[#71717A]">
                Powered by trusted technologies
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

                    <p className="font-mono text-[10px] font-medium text-[#64748B] dark:text-[#71717A]">
                      © 2026 All Rights Reserved
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 font-mono text-[11px] font-bold text-[#64748B] dark:text-[#A1A1AA] sm:justify-end">
                  <button
                    onClick={() => navigate("/app")}
                    className="transition-colors hover:text-brand"
                  >
                    App
                  </button>

                  <button
                    onClick={() => navigate("/terms")}
                    className="transition-colors hover:text-brand"
                  >
                    Terms
                  </button>

                  <button
                    onClick={() => navigate("/app/donate")}
                    className="rounded-full px-3 py-1.5 text-brand transition-all hover:bg-brand hover:text-white"
                  >
                    Donate ♥
                  </button>

                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="X (formerly Twitter)"
                    className="transition-colors hover:text-brand"
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
    </div>
  );
}

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
    subtitle: "Never miss rewards again",
    desc: "Track accruing rewards, view unclaimed rewards, monitor delegations, and know the best time to claim while minimizing gas fees.",
  },
  {
    id: "04",
    icon: ShieldCheckIcon,
    title: "Governance",
    subtitle: "Stay informed",
    desc: "Follow active proposals, browse governance history, and understand what's happening across the Flare network without leaving the dashboard.",
  },
  {
    id: "05",
    icon: SparklesIcon,
    title: "Live Network Insights",
    subtitle: "Powered by real-time data",
    desc: "Monitor FLR price, ecosystem activity, protocols, network statistics, wallet activity, and other live data from across the Flare ecosystem.",
  },
  {
    id: "06",
    icon: Square3Stack3DIcon,
    title: "Smart Alerts",
    subtitle: "Be notified at the right time",
    desc: "Receive alerts for low gas fees, reward opportunities, wallet activity, and important ecosystem events so you never miss what matters.",
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
    name: "Bifrost Wallet",
    logo: bifrostLogo,
  },
];
