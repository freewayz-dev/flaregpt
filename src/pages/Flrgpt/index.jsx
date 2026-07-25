import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { ClockIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

import ChatPane from "@/components/flareGpt/ChatPane";
import { useFlareGptConversation } from "@/hooks/useFlareGptConversation";

// No PageHeader here — its title is redundant with the sidebar's own
// highlighted "FlareGPT" nav item, and its description is already
// duplicated verbatim in the empty state's own greeting (the one place a
// first-time user actually needs it, right before their first message,
// not as permanent chrome after). No card wrapper around the chat either
// — every other page here is a dashboard widget (stats, tables), which is
// what the card convention is for; a conversation isn't a widget, and no
// reference chat product (ChatGPT, Claude) boxes its conversation in a
// bordered card. Just a slim, title-free icon row for History/New Chat,
// then the conversation sits directly on the dashboard's own canvas.
//
// `h-full flex flex-col` so the chat pane gets a real, bounded height to
// manage its own internal scrolling (message list) with the composer
// pinned — a chat surface scrolls internally, it doesn't grow the whole
// page the way other dashboard pages do.
export default function FLRGPT() {
  const { t } = useTranslation();
  const { openWalletModal } = useOutletContext();
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    conversations,
    activeConversation,
    messages,
    isGenerating,
    send,
    stop,
    regenerate,
    startNewConversation,
    switchConversation,
    deleteConversation,
    togglePinConversation,
  } = useFlareGptConversation();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end gap-1.5 pb-2 sm:pb-3 shrink-0">
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          title={t("flrgpt.history.title")}
          aria-label={t("flrgpt.history.title")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary transition-colors cursor-pointer"
        >
          <ClockIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={startNewConversation}
          title={t("flrgpt.history.newChat")}
          aria-label={t("flrgpt.history.newChat")}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors cursor-pointer"
        >
          <PencilSquareIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <ChatPane
          messages={messages}
          isGenerating={isGenerating}
          onSend={send}
          onStop={stop}
          onRegenerate={regenerate}
          onOpenWalletModal={openWalletModal}
          historyOpen={historyOpen}
          onCloseHistory={() => setHistoryOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversation?.id ?? null}
          onSelectConversation={switchConversation}
          onDeleteConversation={deleteConversation}
          onTogglePinConversation={togglePinConversation}
          onNewChat={startNewConversation}
        />
      </div>
    </div>
  );
}
