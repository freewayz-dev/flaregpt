import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";

import {
  ArrowRightIcon,
  CommandLineIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { FadeIn } from "../components/common/MotionWrapper";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);

      console.log("Initializing premium verification cascade...");
    } catch (error) {
      console.error("Authentication aborted:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      id: "01",
      icon: CpuChipIcon,
      title: "Ecosystem Intelligence",
      subtitle: "FlareGPT Context Engine",
      desc: "An advanced, data-aware language model environment directly mapped to active network state parameters. Query FTSO performance records, analyze data protocol changes, and pull immediate insights using smart context vectors.",
    },

    {
      id: "02",
      icon: CircleStackIcon,
      title: "Multi-Wallet Trackers",
      subtitle: "Non-Custodial Observability",
      desc: "Monitor your infrastructure configurations without exposing cryptographic signatures. Layer active hot or hardware wallets alongside read-only target watchlists to observe the health indices of all balances across a single interface.",
    },

    {
      id: "03",
      icon: ArrowTrendingUpIcon,
      title: "Yield & Automation",
      subtitle: "FTSO Reward Optimization",
      desc: "Track global delegation rewards, monitor active epochs, and evaluate the stability profiles of custom collateral pools like $fXRP. Optimize your delegation vectors dynamically using precision data feeds.",
    },

    {
      id: "04",
      icon: ShieldCheckIcon,
      title: "Governance Monitoring",
      subtitle: "Proposal Analytics",
      desc: "Stay ahead of ecosystem updates by monitoring structural proposals and real-time voting weights. Trace community distribution mandates and tracking updates without leaving your primary terminal panel workspace.",
    },

    {
      id: "05",
      icon: SparklesIcon,
      title: "Collateral Health Pools",
      subtitle: "fAssets Delta Watch",
      desc: "Deep analytics tracking stability mechanisms inside asset backing contracts. Receive real-time visibility into over-collateralization data loops and critical safety indices instantly.",
    },

    {
      id: "06",
      icon: Square3Stack3DIcon,
      title: "Native PWA Build",
      subtitle: "Zero Store Overhead",
      desc: "Deploy FlareOS directly onto your local mobile device workspace interface parameters straight from your rendering browser node frame context with high performance execution optimization.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F9] dark:bg-[#09090b] transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1.5px,transparent_1.5px),linear-gradient(to_bottom,#e2e8f0_1.5px,transparent_1.5px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_40%,transparent_100%)] opacity-60 dark:opacity-35 pointer-events-none z-0" />
        <div className="absolute top-44 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-[#E62058]/5 blur-[130px] rounded-full" />
      </div>

      <div className="absolute top-44 sm:top-52 left-1/2 -translate-x-1/2 w-[300px] h-[300px] sm:w-[550px] sm:h-[550px] bg-[#E62058]/10 dark:bg-[#E62058]/5 blur-[70px] sm:blur-[130px] rounded-full pointer-events-none z-30" />

      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: showNav ? 0 : -100 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed top-0 w-full z-50 h-20 flex items-center backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#1D1D20]"
      >
        <div className="w-full max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <div className="h-7 w-7 rounded-lg bg-[#E62058] flex items-center justify-center shadow-md shadow-[#E62058]/20">
              <span className="text-white font-black text-sm tracking-tighter">
                F
              </span>
            </div>
            <span className="font-black text-sm text-[#0F172A] dark:text-[#FAFAFA] tracking-tight">
              FlareGPT
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-40">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F3F4F6] text-[#475569] transition-all hover:border-[#E62058]/20 hover:bg-[#E62058]/10 hover:text-[#E62058] dark:border-[#1D1D20] dark:bg-[#1B1B1F] dark:text-[#A1A1AA] dark:hover:border-[#E62058]/20 dark:hover:bg-[#E62058]/10 dark:hover:text-[#E62058]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F3F4F6] text-[#475569] transition-all hover:border-[#E62058]/20 hover:bg-[#E62058]/10 hover:text-[#E62058] dark:border-[#1D1D20] dark:bg-[#1B1B1F] dark:text-[#A1A1AA] dark:hover:border-[#E62058]/20 dark:hover:bg-[#E62058]/10 dark:hover:text-[#E62058]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.1 18.099a.082.082 0 0 0 .031.058 20.25 20.25 0 0 0 4.986 2.457.075.075 0 0 0 .08-.026c.45-.63.82-1.295 1.115-1.996a.074.074 0 0 0-.04-.102 11.455 11.455 0 0 1-1.636-.778.075.075 0 0 1-.007-.124c.11-.082.22-.168.328-.255a.075.075 0 0 1 .081-.005 13.67 13.67 0 0 0 11.43 0 .075.075 0 0 1 .081.005c.108.087.218.173.328.255a.075.075 0 0 1-.007.124 11.455 11.455 0 0 1-1.636.778.074.074 0 0 0-.04.102c.295.7.665 1.366 1.115 1.996a.075.075 0 0 0 .08.026 20.27 20.27 0 0 0 4.986-2.457.082.082 0 0 0 .031-.058c.51-5.327-.34-9.86-3.57-14.532a.07.07 0 0 0-.032-.027zM8.02 15.332c-1.18 0-2.155-1.085-2.155-2.418s.955-2.418 2.155-2.418c1.21 0 2.175 1.095 2.155 2.418 0 1.333-.955 2.418-2.155 2.418zm7.974 0c-1.18 0-2.155-1.085-2.155-2.418s.955-2.418 2.155-2.418c1.21 0 2.175 1.095 2.155 2.418 0 1.333-.955 2.418-2.155 2.418z" />
                </svg>
              </a>
            </div>
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="rounded-full bg-[#E62058] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#F03A6F] transition-colors shadow-md shadow-[#E62058]/10 cursor-pointer"
            >
              Launch App
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 md:pt-20 pt-14">
        <FadeIn>
          <section className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6 py-24">
            {" "}
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-[#1D1D20] bg-[#FFFFFF]/80 dark:bg-[#161619]/80 backdrop-blur-md px-4 py-1.5 shadow-sm">
              <SparklesIcon className="h-3.5 w-3.5 text-[#E62058]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#475569] dark:text-[#A1A1AA]">
                AI-Powered Flare Copilot
              </span>
            </div>
            {/* Heading */}
            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A] dark:text-[#FAFAFA] select-none">
              Everything{" "}
              <span className="bg-gradient-to-r from-[#E62058] to-[#F03A6F] bg-clip-text text-transparent">
                Flare.
              </span>
              <br />
              Simplified.
            </h1>
            {/* Description */}
            <p className="mt-6 max-w-lg text-sm sm:text-base leading-8 text-[#475569] dark:text-[#A1A1AA]">
              Monitor wallets, track rewards, explore governance, discover yield
              opportunities, and chat with FlareGPT, all from one clean,
              intelligent dashboard.
            </p>
            {/* Supporting Text */}
            <p className="mt-5 max-w-lg text-xs leading-6 text-[#94A3B8] dark:text-[#71717A]">
              No wallet connection required. Explore the platform freely, then
              connect whenever you're ready for personalized insights and future
              on-chain features.
            </p>
            {/* CTA */}
            <div className="mt-10 mb-20 flex flex-col sm:flex-row items-center gap-5">
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="rounded-full bg-[#E62058] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F03A6F] cursor-pointer"
              >
                Launch App
              </button>

              <button
                type="button"
                onClick={handleConnectWallet}
                className="group flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA] transition-colors hover:text-[#E62058] dark:hover:text-[#F03A6F] cursor-pointer"
              >
                Connect Wallet
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="w-full border-y border-[#E5E7EB] dark:border-[#1D1D20] bg-white/50 dark:bg-black/20 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#E5E7EB] dark:divide-[#1D1D20]">
              {[
                { val: "1.4M FLR", label: "Rewards" },
                { val: "130+", label: "Wallets" },
                { val: "167", label: "Providers" },
                { val: "134", label: "Positions" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="py-6 flex flex-col items-center text-center"
                >
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]">
                    {s.label}
                  </span>
                  <span className="mt-1 font-mono text-sm font-bold text-[#0F172A] dark:text-white">
                    {s.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <section className="w-full max-w-5xl mx-auto px-4 py-28">
          <FadeIn>
            <div className="mb-16 text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E62058]/20 bg-[#E62058]/10 px-4 py-1.5 mb-5">
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold text-[#E62058]">
                  What You Can Do
                </span>
              </div>

              <h2 className="text-4xl font-black max-w-xl mx-auto tracking-tight text-[#0F172A] dark:text-[#FAFAFA]">
                Everything you need to navigate
                <span className="block text-[#E62058]">
                  the Flare ecosystem.
                </span>
              </h2>

              <p className="mt-5 max-w-md mx-auto text-sm leading-5 text-[#475569] dark:text-[#A1A1AA]">
                From AI-powered insights and wallet tracking to governance,
                rewards, and ecosystem analytics. FlareGPT brings every
                essential tool together in one intelligent workspace.
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
                    className="h-full group rounded-2xl border border-[#E5E7EB] dark:border-[#1D1D20] bg-[#FFFFFF] dark:bg-[#161619] p-6 transition-all duration-300 hover:border-[#E62058]/20 hover:-translate-y-1"
                  >
                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F4F6] dark:bg-[#1B1B1F] transition-colors group-hover:bg-[#E62058]/10">
                      <Icon className="h-5 w-5 text-[#475569] dark:text-[#A1A1AA] group-hover:text-[#E62058]" />
                    </div>

                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-[13px] text-[#94A3B8] dark:text-[#71717A]">
                      {item.subtitle}
                    </p>

                    <p className="mt-5 text-sm leading-7 text-[#475569] dark:text-[#A1A1AA]">
                      {item.desc}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        <FadeIn delay={0.3}>
          <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <div className="relative overflow-hidden rounded-3xl border border-[#E5E7EB] dark:border-[#1D1D20] bg-gradient-to-b from-[#FFFFFF] to-[#F3F4F6] dark:from-[#161619] dark:to-[#121214] p-12 sm:p-16 shadow-xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#E62058]/10 dark:bg-[#E62058]/5 blur-[80px] rounded-full pointer-events-none" />

              <div className="inline-flex items-center gap-2 rounded-full border border-[#E62058]/20 bg-[#E62058]/10 px-4 py-1.5 mb-5">
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold text-[#E62058]">
                  Get Started
                </span>
              </div>

              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#0F172A] dark:text-[#FAFAFA] tracking-tight max-w-md mx-auto leading-tight">
                Ready to explore
                <span className="block text-[#E62058]">FlareGPT?</span>
              </h2>

              <p className="mt-4 text-xs text-[#475569] dark:text-[#71717A] max-w-xs mx-auto leading-relaxed">
                Launch the app instantly to explore wallets, rewards,
                governance, and AI-powered insights. Connect your wallet anytime
                for a more personalized experience.
              </p>

              <div className="relative z-10 mt-10 flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="rounded-full bg-[#E62058] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#F03A6F] shadow-lg shadow-[#E62058]/20 hover:shadow-[#E62058]/30 active:scale-[0.98]"
                >
                  Launch App
                </button>

                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="group flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA] transition-colors hover:text-[#E62058] dark:hover:text-[#F03A6F]"
                >
                  Connect Wallet
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>
        </FadeIn>
      </main>

      <footer className="w-full border-t border-[#E5E7EB] dark:border-[#1D1D20] bg-[#F0F4F9]/80 dark:bg-[#09090b]/80 backdrop-blur-md py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-[#E62058] flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-[10px] tracking-tighter">
                F
              </span>
            </div>

            <span className="font-black text-xs text-[#0F172A] dark:text-[#FAFAFA] tracking-tight">
              FlareGPT
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] text-[#475569] dark:text-[#A1A1AA] font-bold">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E62058] dark:hover:text-[#E62058] transition-colors group"
              aria-label="X (formerly Twitter)"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <button
              type="button"
              onClick={() => navigate("/terms")}
              className="hover:text-[#E62058] dark:hover:text-[#E62058] transition-colors cursor-pointer"
            >
              Terms & Disclaimer
            </button>

            <button
              type="button"
              onClick={() => navigate("/app/donate")}
              className="inline-flex items-center gap-1 text-[#E62058] hover:text-[#F03A6F] transition-colors cursor-pointer"
            >
              <span>Donate</span>

              <span className="text-[8px] px-1 rounded bg-[#E62058]/10">♥</span>
            </button>
          </div>

          <p className="font-mono text-[9px] text-[#94A3B8] dark:text-[#71717A] font-bold">
            © 2026 FlareGPT. Built on Flare Network.
          </p>
        </div>
      </footer>
    </div>
  );
}
