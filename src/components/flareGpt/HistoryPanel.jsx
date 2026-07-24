import { useTranslation } from "react-i18next";
import { XMarkIcon, TrashIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";

import { shortenAddress } from "@/utils/address";

function formatRelativeTime(timestamp, locale) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round((timestamp - Date.now()) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

// An overlay on top of the whole chat pane (message list + composer),
// not a permanent rail squeezing the conversation width — history
// browsing is occasional and transient, so it shouldn't cost a
// permanently-narrower chat the rest of the time. Each entry shows a
// relative timestamp (via Intl.RelativeTimeFormat, which handles
// locale-correct pluralization for free rather than hand-translating
// "2 hours ago" across 15 languages) and, when the conversation was
// scoped to a wallet, a small address reference — letting a returning
// user tell which thread was about which wallet without opening it.
export default function HistoryPanel({
  open,
  onClose,
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNewChat,
}) {
  const { t, i18n } = useTranslation();
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute inset-0 z-20 flex flex-col bg-surface-card"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
            <p className="text-sm font-semibold text-ink-primary">{t("flrgpt.history.title")}</p>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-subtle text-ink-secondary transition-colors cursor-pointer"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3 shrink-0">
            <button
              type="button"
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand/10 text-brand text-xs font-semibold py-2.5 hover:bg-brand/20 transition-colors cursor-pointer"
            >
              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
              {t("flrgpt.history.newChat")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-none">
            {sorted.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-ink-muted">{t("flrgpt.history.empty")}</p>
              </div>
            ) : (
              sorted.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(conv.id);
                      }
                    }}
                    className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
                      isActive ? "bg-brand/10" : "hover:bg-surface-subtle"
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-brand" : "text-ink-primary"
                        }`}
                      >
                        {conv.title || t("flrgpt.history.untitled")}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-ink-muted">
                          {formatRelativeTime(conv.updatedAt, i18n.language)}
                        </span>
                        {conv.walletAddress && (
                          <span className="text-[10px] text-ink-muted font-mono">
                            · {shortenAddress(conv.walletAddress)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="shrink-0 p-1 rounded-md text-ink-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
