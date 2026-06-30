// import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  Battery100Icon,
  SignalIcon,
  WifiIcon,
} from "@heroicons/react/24/solid";

export default function AIPhoneMockup() {
  return (
    <div className="relative flex w-full justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[55%] -z-10 h-[180px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(230,32,88,0.18) 0%, rgba(230,32,88,0.08) 55%, transparent 100%)",
        }}
      />
      {/* <motion.div
        whileHover={{
          scale: 1.015,
        }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 20,
        }}
      > */}
      <div className="relative h-[500px] w-[280px] rounded-[50px] bg-[#09090B] p-[7px] sm:w-[285px]">
        <div className="absolute inset-0 rounded-[50px] border border-white/10" />
        <div className="absolute inset-[3px] rounded-[46px] border border-white/5" />

<div className="relative flex h-full flex-col overflow-hidden rounded-[42px] bg-white dark:bg-[#111113]">
              {/* Status */}
          <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-semibold text-[#0F172A] dark:text-white">
            <span>9:41</span>

            <div className="flex items-center gap-1">
              <SignalIcon className="h-3 w-3" />
              <WifiIcon className="h-3 w-3" />
              <Battery100Icon className="h-4 w-4" />
            </div>
          </div>

          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-3 h-7 w-28 -translate-x-1/2 rounded-full border border-white/10 bg-black" />

          {/* Header */}
          <div className="border-b border-[#E5E7EB] px-5 pb-4 pt-8 dark:border-[#1D1D20]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#64748B] dark:text-[#71717A]">
              FlareGPT
            </p>

            <h3 className="mt-1 text-base font-bold text-[#0F172A] dark:text-white">
              Good afternoon 👋
            </h3>

            <p className="mt-1 text-xs leading-5 text-[#64748B] dark:text-[#A1A1AA]">
              Ask anything about your portfolio.
            </p>
          </div>

          {/* Messages */}
<div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 text-[13px] space-y-4 scrollbar-none">            <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-md bg-[#E62058] px-4 py-3 text-white">
              Analyze my wallet
            </div>

            <div className="max-w-[92%] rounded-3xl rounded-bl-md border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 leading-6 text-[#334155] dark:border-[#232327] dark:bg-[#17171A] dark:text-[#E4E4E7]">
              I found a few things worth your attention.
              <br />
              <br />•{" "}
              <span className="font-semibold text-[#0F172A] dark:text-white">
                47.2 FLR
              </span>{" "}
              is ready to claim.
              <br />
              • Your delegation has earned rewards consistently across recent
              epochs.
              <br />
              • A governance proposal is awaiting your vote.
              <br />
              <br />
              Overall, your wallet is healthy with no unusual activity detected.
            </div>

            <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-md bg-[#E62058] px-4 py-3 text-white">
              Should I claim now?
            </div>

            <div className="max-w-[92%] rounded-3xl rounded-bl-md border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 leading-6 text-[#334155] dark:border-[#232327] dark:bg-[#17171A] dark:text-[#E4E4E7]">
              Yes. Network fees are currently near today's lowest level.
              <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#2A2A2E] dark:bg-[#111113]">
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#71717A]">
                    Estimated Reward
                  </span>

                  <span className="font-semibold text-[#22C55E]">46.8 FLR</span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-[#64748B] dark:text-[#71717A]">
                    Network Fee
                  </span>

                  <span className="text-[#0F172A] dark:text-white">Low</span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-[#64748B] dark:text-[#71717A]">
                    Recommendation
                  </span>

                  <span className="font-semibold text-[#E62058]">
                    Claim Now
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 dark:border-[#26262B] dark:bg-[#1A1A1D]">
              <span className="text-sm text-[#64748B] dark:text-[#71717A]">
                Ask FlareGPT...
              </span>

              <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#E62058]">
                <ArrowRightIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 h-1.5 w-32 -translate-x-1/2 rounded-full bg-[#CBD5E1] dark:bg-white/20" />
        </div>
      </div>
      {/* </motion.div> */}
    </div>
  );
}
