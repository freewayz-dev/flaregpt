import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ClockIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

import ChatPane from "@/components/flareGpt/ChatPane";
import ConversationHistoryPanel from "@/components/flareGpt/ConversationHistoryPanel";
import { useFlareGptConversation } from "@/hooks/useFlareGptConversation";
import { useFlareGptStore } from "@/store/useFlareGptStore";
import { useConversations, useRenameConversation } from "@/hooks/queries/useChatQueries";
import { ROUTES } from "@/config/routes";

// Below `lg` (1024px — the same breakpoint Sidebar.jsx uses to hide this
// route's own nav link), FlareGPT is reached exclusively as the FAB-opened
// overlay, never as a dedicated page — the two are pixel-identical there
// (the widget renders full-screen), so a direct hit on this URL (a
// bookmark, a typed address, eventually a shared conversation link)
// should land in the same place a mobile user would actually get here:
// the overlay, not a second, inconsistent "page" version of it that lacks
// the widget's close affordance. Checked once via a lazy useState
// initializer (not reactively on resize) so a desktop user who shrinks
// their window mid-read never gets yanked into the overlay mid-session —
// only the state at the moment this route is first landed on decides.
function isMobileLanding() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

// No PageHeader here — its title is redundant with the sidebar's own
// highlighted "FlareGPT" nav item, and its description is already
// duplicated verbatim in the empty state's own greeting (the one place a
// first-time user actually needs it, right before their first message,
// not as permanent chrome after). No card wrapper around the chat either
// — every other page here is a dashboard widget (stats, tables), which is
// what the card convention is for; a conversation isn't a widget, and no
// reference chat product (ChatGPT, Claude) boxes its conversation in a
// bordered card. Just a slim, title-free icon row for New Chat / History,
// then the conversation sits directly on the dashboard's own canvas.
// Deleting a conversation lives exclusively in the history panel's row
// menu now — a second, standalone trash icon here would just be the same
// action reachable two ways, and specifically the *wrong* two ways when
// only one of them (the panel) can target a conversation other than
// whichever happens to be open right now.
//
// `h-full flex flex-col` so the chat pane gets a real, bounded height to
// manage its own internal scrolling (message list) with the composer
// pinned — a chat surface scrolls internally, it doesn't grow the whole
// page the way other dashboard pages do.
export default function FLRGPT() {
  const { t } = useTranslation();
  const { openWalletModal } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldRedirectToWidget] = useState(isMobileLanding);

  useLayoutEffect(() => {
    if (!shouldRedirectToWidget) return;
    // Forward any existing query params (e.g. a future shared-conversation
    // link) rather than dropping them, and signal DashboardLayout to open
    // the widget once it mounts at the redirect target.
    const params = new URLSearchParams(location.search);
    params.set("openFlareGpt", "1");
    navigate(`${ROUTES.app}?${params.toString()}`, { replace: true });
    // Intentionally mount-only — see isMobileLanding's comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations(hasSession);
  const renameMutation = useRenameConversation();

  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleHistory = () => setHistoryOpen((open) => !open);

  const handleSelectFromHistory = (id) => {
    switchConversation(id);
    setHistoryOpen(false);
  };

  const handleNewChatFromHistory = () => {
    startNewChat();
    setHistoryOpen(false);
  };

  // The redirect above fires before paint, but skip mounting the (fairly
  // heavy) ChatPane tree entirely rather than rendering it for one frame
  // it'll never actually be seen in.
  if (shouldRedirectToWidget) return null;

  return (
    <div className="h-full flex flex-col">
      {/* One tight-knit toolbar rather than two icons floating apart at
          their own default gap — New Chat and History are the same kind
          of control (a thread-management action, distinct from anything
          conversation-content-related), so they read as one unit sharing
          a single rounded surface. Bottom padding trimmed further on
          desktop (`lg:`) specifically — this row plus the message list's
          own internal top padding was pushing the first visible message,
          and therefore the composer beneath a growing transcript, further
          up the viewport than a wider screen actually needs to. */}
      <div className="flex items-center justify-end pb-2 lg:pb-1 shrink-0">
        <div className="flex items-center gap-0.5 rounded-xl bg-surface-subtle p-0.5">
          <button
            type="button"
            onClick={startNewChat}
            title={t("flrgpt.newChat")}
            aria-label={t("flrgpt.newChat")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary transition-colors cursor-pointer"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>

          {hasSession && (
            <button
              type="button"
              onClick={toggleHistory}
              title={t("flrgpt.history.openButton")}
              aria-label={t("flrgpt.history.openButton")}
              aria-pressed={historyOpen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                historyOpen
                  ? "bg-brand/10 text-brand"
                  : "text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary"
              }`}
            >
              <ClockIcon className="h-4 w-4" />
            </button>
          )}
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
          onOpenWalletModal={openWalletModal}
          scrollRequestId={scrollRequestId}
          focusRequestId={focusRequestId}
        />

        {hasSession && (
          <ConversationHistoryPanel
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            conversations={conversations}
            isLoading={isLoadingConversations}
            activeConversationId={activeConversationId}
            pinnedIds={pinnedConversationIds}
            onSelect={handleSelectFromHistory}
            onNewChat={handleNewChatFromHistory}
            onTogglePin={togglePinnedConversation}
            onRename={(id, title) => renameMutation.mutateAsync({ conversationId: id, title })}
            onDelete={deleteConversation}
          />
        )}
      </div>
    </div>
  );
}
