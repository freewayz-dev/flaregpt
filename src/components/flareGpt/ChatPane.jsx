import EmptyState from "@/components/flareGpt/EmptyState";
import MessageList from "@/components/flareGpt/MessageList";
import Composer from "@/components/flareGpt/Composer";
import HistoryPanel from "@/components/flareGpt/HistoryPanel";

// Everything below the surface-specific header (page top bar vs. drawer
// header) — rendered identically by both the full page and the side
// drawer, reading/writing the same useFlareGptStore, which is the actual
// mechanism behind "the drawer is an extension of the main experience,
// not a separate product": they're not two implementations that happen
// to look similar, they're the same implementation at a different width.
export default function ChatPane({
  messages,
  isGenerating,
  onSend,
  onStop,
  onRegenerate,
  onOpenWalletModal,
  historyOpen,
  onCloseHistory,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onTogglePinConversation,
  onNewChat,
  compactEmptyState = false,
}) {
  const hasMessages = messages.length > 0;

  const handleSelectPrompt = (id, text) => onSend(text, id);

  return (
    <div className="relative flex flex-1 min-h-0 flex-col">
      {hasMessages ? (
        <MessageList messages={messages} onRegenerate={onRegenerate} />
      ) : (
        <EmptyState onSelectPrompt={handleSelectPrompt} compact={compactEmptyState} />
      )}

      <Composer onSend={onSend} isGenerating={isGenerating} onStop={onStop} onOpenWalletModal={onOpenWalletModal} />

      <HistoryPanel
        open={historyOpen}
        onClose={onCloseHistory}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={(id) => {
          onSelectConversation(id);
          onCloseHistory();
        }}
        onDelete={onDeleteConversation}
        onTogglePin={onTogglePinConversation}
        onNewChat={() => {
          onNewChat();
          onCloseHistory();
        }}
      />
    </div>
  );
}
