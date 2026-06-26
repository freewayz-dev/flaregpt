import { useState } from "react";
import {
  XMarkIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

const suggestions = [
  "What is FLR price today?",
  "Show wallet balance",
  "How do I earn FTSO rewards?",
  "Explain Flare Network",
  "Latest governance proposals",
];

const mockHistory = [
  "FLR price analysis",
  "Wallet setup help",
  "Yield strategies",
  "Governance discussion",
];

export default function FlareWidget({ open, onClose }) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const widthClasses = expanded 
    ? "w-[calc(100%-32px)] md:w-[620px]" 
    : "w-[calc(100%-32px)] sm:w-[380px]";

  const canSend = input.trim().length > 0;

  return (
    <aside
      className={`fixed z-50 flex flex-col bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl 
        dark:bg-[#161619] dark:border-none
        right-4 left-4 bottom-4 top-16 sm:left-auto sm:top-14 sm:bottom-4
        transform-gpu transition-all duration-300 ease-in-out
        ${widthClasses} 
        ${open ? "translate-x-0 opacity-100 scale-100" : "translate-x-full sm:translate-x-[120%] opacity-0 scale-95 pointer-events-none"}`}
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#1D1D20] px-3 py-2.5 sm:py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-lg p-1 transition-colors hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F]"
            title="Chat history"
          >
            <Bars3Icon className="h-5 w-5 text-[#475569] dark:text-[#A1A1AA]" />
          </button>

          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
            FlareGPT
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              setInput("");
              setShowHistory(false);
            }}
            className="rounded-lg p-1 transition-colors hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F]"
            title="New chat"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#E62058]" />
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="hidden sm:flex rounded-lg p-1 transition-colors hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F]"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-[#475569] dark:text-[#A1A1AA]" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-[#475569] dark:text-[#A1A1AA]" />
            )}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-[#F3F4F6] dark:hover:bg-[#1B1B1F]"
            title="Close"
          >
            <XMarkIcon className="h-5 w-5 text-[#475569] dark:text-[#A1A1AA]" />
          </button>
        </div>
      </div>

      {/* CORE CONTENT SHELL */}
      <div className="relative flex-1 overflow-hidden">
        {!showHistory && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div className="rounded-xl bg-[#E62058]/10 p-3 text-sm text-[#E62058] font-medium">
                Flare Mainnet • Live Assistant
              </div>

              {/* Dynamic Action Prompts */}
              <div className="space-y-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="w-full text-left text-xs rounded-xl px-3 py-2 bg-[#F3F4F6] border border-[#E5E7EB] text-[#475569] hover:bg-[#E5E7EB] dark:bg-[#1B1B1F] dark:border-none dark:text-[#FAFAFA] dark:hover:bg-[#1B1B1F]/70 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Hub Footbar */}
            <div className="border-t border-[#E5E7EB] dark:border-[#1D1D20] p-3 bg-[#FFFFFF] dark:bg-[#161619] rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask FlareGPT..."
                  className="flex-1 rounded-xl border px-3 py-2 text-sm border-[#E5E7EB] bg-[#FFFFFF] text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#E62058] dark:border-none dark:bg-[#121214] dark:text-[#FAFAFA] dark:placeholder-[#71717A] focus:ring-1 focus:ring-[#E62058] dark:focus:ring-1 dark:focus:ring-[#E62058] transition-colors"
                />

                <button
                  disabled={!canSend}
                  className={`p-2 rounded-xl transition-colors shrink-0
                    ${
                      canSend
                        ? "bg-[#E62058] text-white hover:bg-[#F03A6F]"
                        : "bg-[#F3F4F6] text-[#94A3B8] cursor-not-allowed dark:bg-[#1B1B1F] dark:text-[#71717A]"
                    }
                  `}
                  title="Send"
                >
                  <PaperAirplaneIcon className="h-4 w-4 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHAT HISTORY PANEL OVERLAY */}
        {showHistory && (
          <div className="absolute inset-0 flex flex-col bg-[#FFFFFF] dark:bg-[#161619] rounded-b-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#1D1D20] px-3 py-2.5 sm:py-2">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                Chat History
              </p>

              <button
                onClick={() => setShowHistory(false)}
                className="text-xs font-medium text-[#475569] hover:text-[#0F172A] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA] p-1 rounded transition-colors"
              >
                Back
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mockHistory.map((item) => (
                <button
                  key={item}
                  className="w-full text-left text-xs rounded-xl px-3 py-2 bg-[#F3F4F6] border border-[#E5E7EB] text-[#475569] hover:bg-[#E5E7EB] dark:bg-[#1B1B1F] dark:border-none dark:text-[#FAFAFA] dark:hover:bg-[#1B1B1F]/70 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}