import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  TrashIcon,
  CheckIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

import ChatPane from "@/components/flareGpt/ChatPane";
import { useFlareGptConversation } from "@/hooks/useFlareGptConversation";
import { ROUTES } from "@/config/routes";

const CONFIRM_WINDOW_MS = 3000;

// An extension of the full FlareGPT page, not a separate product: this
// renders the exact same ChatPane (message list, composer, wallet pill)
// reading the exact same useFlareGptStore, so a conversation started here
// is the same conversation you'd see by navigating to /app/flare-gpt — not
// a lookalike, the same thread (and the same single backend-held history).
//
// Mobile is true full-screen (zero insets) rather than a floating card
// with dashboard edges peeking around it — a widget that still shows the
// page behind it reads as "temporary panel"; full-screen reads as a
// first-class surface, matching how chat-first products treat mobile.
export default function FlareWidget({ open, onClose, onOpenWalletModal }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const {
    messages,
    isGenerating,
    isLoadingHistory,
    send,
    stop,
    regenerate,
    clearChat,
    scrollRequestId,
    focusRequestId,
  } = useFlareGptConversation();

  const [confirmingClear, setConfirmingClear] = useState(false);
  const confirmTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  const handleClearClick = () => {
    if (confirmingClear) {
      clearTimeout(confirmTimerRef.current);
      setConfirmingClear(false);
      clearChat();
      return;
    }
    setConfirmingClear(true);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirmingClear(false), CONFIRM_WINDOW_MS);
  };

  const widthClasses = expanded
    ? "sm:w-[680px]"
    : "sm:w-[400px]";

  const handleOpenFullPage = () => {
    // `skipBack` + `replace` rather than the normal close-then-push: on
    // mobile the widget may own a dummy history entry for back-button
    // safety (see DashboardLayout), and racing an async `history.back()`
    // against this navigation could pop the wrong entry. Replacing the
    // current entry with the real route absorbs the dummy cleanly instead.
    onClose({ skipBack: true });
    navigate(ROUTES.flareGpt, { replace: true });
  };

  return (
    <aside
      className={`fixed z-50 flex flex-col bg-[#FFFFFF] border border-[#E5E7EB] shadow-xl
        dark:bg-[#161619] dark:border-none
        inset-0 rounded-none
        sm:inset-auto sm:right-4 sm:left-auto sm:top-14 sm:bottom-4 sm:rounded-2xl
        w-full ${widthClasses}
        transform-gpu transition-all duration-300 ease-in-out
        ${open ? "translate-x-0 opacity-100 scale-100" : "translate-x-full sm:translate-x-[120%] opacity-0 scale-95 pointer-events-none"}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:py-2 shrink-0">
        <button
          type="button"
          onClick={handleOpenFullPage}
          className="text-sm font-semibold text-ink-primary hover:text-brand-text transition-colors cursor-pointer"
          title={t("flareWidget.openFullPage")}
        >
          FlareGPT
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearClick}
              className={`rounded-lg p-1 transition-colors cursor-pointer ${
                confirmingClear ? "bg-red-500/10" : "hover:bg-surface-subtle"
              }`}
              title={confirmingClear ? t("flrgpt.clearChat.confirm") : t("flrgpt.clearChat.button")}
            >
              {confirmingClear ? (
                <CheckIcon className="h-5 w-5 text-red-500" />
              ) : (
                <TrashIcon className="h-5 w-5 text-ink-secondary" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="hidden sm:flex rounded-lg p-1 transition-colors hover:bg-surface-subtle cursor-pointer"
            title={expanded ? t("flareWidget.collapse") : t("flareWidget.expand")}
          >
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-ink-secondary" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-ink-secondary" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle cursor-pointer"
            title={t("flareWidget.close")}
          >
            <XMarkIcon className="h-5 w-5 text-ink-secondary" />
          </button>
        </div>
      </div>

      <ChatPane
        messages={messages}
        isGenerating={isGenerating}
        isLoadingHistory={isLoadingHistory}
        onSend={send}
        onStop={stop}
        onRegenerate={regenerate}
        onOpenWalletModal={onOpenWalletModal}
        scrollRequestId={scrollRequestId}
        focusRequestId={focusRequestId}
        compactEmptyState
      />
    </aside>
  );
}
