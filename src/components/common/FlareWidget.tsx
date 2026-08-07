import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  XMarkIcon,
  ClockIcon,
  PencilSquareIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

import ChatPane from "@/components/flareGpt/ChatPane";
import ConversationHistoryPanel from "@/components/flareGpt/ConversationHistoryPanel";
import { useFlareGptConversation } from "@/hooks/useFlareGptConversation";
import { useFlareGptStore } from "@/store/useFlareGptStore";
import { useConversations, useRenameConversation } from "@/hooks/queries/useChatQueries";
import { ROUTES } from "@/config/routes";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// An extension of the full FlareGPT page, not a separate product: this
// renders the exact same ChatPane (message list, composer, wallet pill)
// reading the exact same useFlareGptStore, so a conversation started here
// is the same conversation you'd see by navigating to /app/flare-gpt — not
// a lookalike, the same thread. Deleting a conversation lives exclusively
// in the history panel's row menu (see Flrgpt/index.jsx for why a second,
// standalone trash icon here would be redundant).
//
// Mobile is true full-screen (zero insets) rather than a floating card
// with dashboard edges peeking around it — a widget that still shows the
// page behind it reads as "temporary panel"; full-screen reads as a
// first-class surface, matching how chat-first products treat mobile.
interface FlareWidgetProps {
  open: boolean;
  onClose: (options?: { skipBack?: boolean }) => void;
  onOpenWalletModal: () => void;
}

export default function FlareWidget({ open, onClose, onOpenWalletModal }: FlareWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const widgetRef = useRef<HTMLElement>(null);

  useFocusTrap(widgetRef, open);

  const {
    messages,
    isGenerating,
    isLoadingMessages,
    activeConversationId,
    hasSession,
    send,
    stop,
    regenerate,
    startNewChat,
    switchConversation,
    deleteConversation,
    scrollRequestId,
    focusRequestId,
  } = useFlareGptConversation();

  const pinnedConversationIds = useFlareGptStore((s) => s.pinnedConversationIds);
  const togglePinnedConversation = useFlareGptStore((s) => s.togglePinnedConversation);

  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useConversations(hasSession);
  const renameMutation = useRenameConversation();

  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleHistory = () => setHistoryOpen((o) => !o);

  // Deferring to the history panel's own Escape handler while it's open
  // (rather than both firing on the same keypress) so Escape closes
  // whichever overlay is actually on top first — the panel, then the
  // widget itself on a second press — matching every other stacked
  // overlay's behavior in the app.
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || historyOpen) return;
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, historyOpen, onClose]);

  const handleSelectFromHistory = (id: string) => {
    switchConversation(id);
    setHistoryOpen(false);
  };

  const handleNewChatFromHistory = () => {
    startNewChat();
    setHistoryOpen(false);
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
      ref={widgetRef}
      role="dialog"
      aria-modal="true"
      aria-label="FlareGPT"
      className={`fixed z-50 flex flex-col bg-[#FFFFFF] border border-[#E5E7EB] shadow-xl
        dark:bg-[#161619] dark:border-none
        inset-0 rounded-none
        pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
        sm:inset-auto sm:right-4 sm:left-auto sm:top-14 sm:bottom-4 sm:rounded-2xl sm:pt-0 sm:pl-0 sm:pr-0
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
          {/* New Chat and History grouped on one shared surface with a
              tight internal gap — they're the same kind of thread-
              management control, distinct from the window-chrome actions
              (expand/collapse, close) that follow. */}
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-subtle p-0.5">
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-md p-1 transition-colors hover:bg-surface-card-hover cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
              title={t("flrgpt.newChat")}
              aria-label={t("flrgpt.newChat")}
            >
              <PencilSquareIcon className="h-5 w-5 text-ink-secondary" />
            </button>

            {hasSession && (
              <button
                type="button"
                onClick={toggleHistory}
                aria-pressed={historyOpen}
                className={`rounded-md p-1 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
                  historyOpen ? "bg-brand/10" : "hover:bg-surface-card-hover"
                }`}
                title={t("flrgpt.history.openButton")}
                aria-label={t("flrgpt.history.openButton")}
              >
                <ClockIcon className={`h-5 w-5 ${historyOpen ? "text-brand" : "text-ink-secondary"}`} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="hidden sm:flex rounded-lg p-1 transition-colors hover:bg-surface-subtle cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
            title={expanded ? t("flareWidget.collapse") : t("flareWidget.expand")}
            aria-label={expanded ? t("flareWidget.collapse") : t("flareWidget.expand")}
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
            className="rounded-lg p-1 transition-colors hover:bg-surface-subtle cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
            title={t("flareWidget.close")}
            aria-label={t("flareWidget.close")}
          >
            <XMarkIcon className="h-5 w-5 text-ink-secondary" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
        <ChatPane
          messages={messages}
          isGenerating={isGenerating}
          isLoadingHistory={isLoadingMessages}
          onSend={send}
          onStop={stop}
          onRegenerate={regenerate}
          onOpenWalletModal={onOpenWalletModal}
          scrollRequestId={scrollRequestId}
          focusRequestId={focusRequestId}
          compactEmptyState
        />

        {hasSession && (
          <ConversationHistoryPanel
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            conversations={conversations}
            isLoading={isLoadingConversations}
            isError={isConversationsError}
            onRetry={refetchConversations}
            activeConversationId={activeConversationId}
            pinnedIds={pinnedConversationIds}
            onSelect={handleSelectFromHistory}
            onNewChat={handleNewChatFromHistory}
            onTogglePin={togglePinnedConversation}
            onRename={(id: string, title: string) =>
              renameMutation.mutateAsync({ conversationId: id, title })
            }
            onDelete={deleteConversation}
          />
        )}
      </div>
    </aside>
  );
}
