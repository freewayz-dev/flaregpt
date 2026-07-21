import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  XMarkIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

export default function FlareWidget({ open, onClose }) {
  const { t } = useTranslation();
  const suggestions = t("flareWidget.suggestions", { returnObjects: true });
  const mockHistory = t("flareWidget.mockHistory", { returnObjects: true });

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
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle"
            title={t("flareWidget.chatHistory")}
          >
            <Bars3Icon className="h-5 w-5 text-ink-secondary" />
          </button>

          <span className="text-sm font-semibold text-ink-primary">
            FlareGPT
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              setInput("");
              setShowHistory(false);
            }}
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle"
            title={t("flareWidget.newChat")}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-brand" />
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="hidden sm:flex rounded-lg p-1 transition-colors hover:bg-surface-subtle"
            title={expanded ? t("flareWidget.collapse") : t("flareWidget.expand")}
          >
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-ink-secondary" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-ink-secondary" />
            )}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle"
            title={t("flareWidget.close")}
          >
            <XMarkIcon className="h-5 w-5 text-ink-secondary" />
          </button>
        </div>
      </div>

      {/* CORE CONTENT SHELL */}
      <div className="relative flex-1 overflow-hidden">
        {!showHistory && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div className="rounded-xl bg-brand/10 p-3 text-sm text-brand font-medium">
                {t("flareWidget.liveBanner")}
              </div>

              {/* Dynamic Action Prompts */}
              <div className="space-y-2">
                {suggestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(q)}
                    className="w-full text-left text-xs rounded-xl px-3 py-2 bg-surface-subtle border border-[#E5E7EB] text-[#475569] hover:bg-[#E5E7EB] dark:border-none dark:text-[#FAFAFA] dark:hover:bg-[#1B1B1F]/70 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Hub Footbar */}
            <div className="border-t border-line p-3 bg-[#FFFFFF] dark:bg-[#161619] rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("flareWidget.inputPlaceholder")}
                  className="flex-1 rounded-xl border px-3 py-2 text-base border-[#E5E7EB] bg-[#FFFFFF] text-ink-primary placeholder-ink-muted outline-none focus:border-brand dark:border-none dark:bg-[#121214] focus:ring-1 focus:ring-brand dark:focus:ring-1 dark:focus:ring-brand transition-colors"
                />

                <button
                  disabled={!canSend}
                  className={`p-2 rounded-xl transition-colors shrink-0 ${
                    canSend
                      ? "bg-brand text-white hover:bg-brand-hover"
                      : "bg-surface-subtle text-ink-muted cursor-not-allowed"
                  }`}
                  title={t("flareWidget.send")}
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
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:py-2">
              <p className="text-sm font-semibold text-ink-primary">
                {t("flareWidget.historyTitle")}
              </p>

              <button
                onClick={() => setShowHistory(false)}
                className="text-xs font-medium text-ink-secondary hover:text-ink-primary p-1 rounded transition-colors"
              >
                {t("flareWidget.back")}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mockHistory.map((item, index) => (
                <button
                  key={index}
                  className="w-full text-left text-xs rounded-xl px-3 py-2 bg-surface-subtle border border-[#E5E7EB] text-[#475569] hover:bg-[#E5E7EB] dark:border-none dark:text-[#FAFAFA] dark:hover:bg-[#1B1B1F]/70 transition-colors"
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