import { useTranslation } from "react-i18next";

import EmptyState from "@/components/flareGpt/EmptyState";
import MessageList from "@/components/flareGpt/MessageList";
import Composer from "@/components/flareGpt/Composer";




// Everything below the surface-specific header (page top bar vs. drawer
// header) — rendered identically by both the full page and the side
// drawer, reading/writing the same useFlareGptStore, which is the actual
// mechanism behind "the drawer is an extension of the main experience,
// not a separate product": they're not two implementations that happen
// to look similar, they're the same implementation at a different width.
export default function ChatPane({
  messages,
  isGenerating,
  isLoadingHistory,
  onSend,
  onStop,
  onRegenerate,
  onOpenWalletModal,
  scrollRequestId,
  focusRequestId,
  compactEmptyState = false,
}) {
  const { t } = useTranslation();
  const hasMessages = messages.length > 0;

  const handleSelectPrompt = (_id, text) => onSend(text);

  return (
    <div className="relative flex flex-1 min-h-0 flex-col">
      {isLoadingHistory ? (
        // The real backend can be slow to answer the very first request in
        // a while (a cold-started instance took well over a minute during
        // testing) — showing the empty-state greeting during that window
        // would misrepresent an account that actually has history as a
        // blank slate, and a message sent in that gap would land ahead of
        // history that hasn't arrived yet.
        <div className="flex-1 flex items-center justify-center" role="status">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand" aria-hidden="true" />
          <span className="sr-only">{t("flrgpt.history.loading")}</span>
        </div>
      ) : hasMessages ? (
        <MessageList
          messages={messages}
          onRegenerate={onRegenerate}
          scrollRequestId={scrollRequestId}
        />
      ) : (
        <EmptyState onSelectPrompt={handleSelectPrompt} compact={compactEmptyState} />
      )}

      <Composer
        onSend={onSend}
        isGenerating={isGenerating}
        onStop={onStop}
        onOpenWalletModal={onOpenWalletModal}
        focusRequestId={focusRequestId}
        disabled={isLoadingHistory}
      />
    </div>
  );
}
