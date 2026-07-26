import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  XMarkIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  MapPinIcon as MapPinIconOutline,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinIconSolid } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";

import { shortenAddress } from "@/utils/address";

// A handful, not one and not unlimited: one pin forces re-litigating your
// single "most important" thread every time focus shifts across a
// session, which is friction without much upside. Unlimited pins is the
// opposite failure — pin loses its meaning the moment everything can be
// pinned. 3 is the same cap WhatsApp settled on for pinned chats, and it's
// enough for the realistic case (a couple of active threads at once)
// while still forcing a real choice once it's full.
const PIN_LIMIT = 3;

function formatRelativeTime(timestamp, locale) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round((timestamp - Date.now()) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

// Replaces the old hover-revealed pin/delete icon pair — hover isn't a
// touch-device concept at all, so those actions were effectively
// undiscoverable on mobile until someone happened to tap the row and
// then notice the icons appear. A persistent three-dot trigger works
// identically on both input types: it's always visible, and what it
// opens is the same either way.
function RowMenu({ isPinned, onTogglePin, onDelete, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="true"
        aria-expanded={open}
        title={t("flrgpt.history.moreActions")}
        className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      <div
        className={`absolute right-0 top-full mt-1 w-36 rounded-xl border border-line bg-surface-card p-1 shadow-lg z-30 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-surface-inset hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
        >
          {isPinned ? (
            <MapPinIconSolid className="h-3.5 w-3.5 shrink-0 text-brand" />
          ) : (
            <MapPinIconOutline className="h-3.5 w-3.5 shrink-0" />
          )}
          {isPinned ? t("flrgpt.history.unpin") : t("flrgpt.history.pin")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          {t("flrgpt.history.delete")}
        </button>
      </div>
    </div>
  );
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
  onTogglePin,
  onNewChat,
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      }),
    [conversations],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) =>
      (c.title || t("flrgpt.history.untitled")).toLowerCase().includes(q),
    );
  }, [sorted, query, t]);

  const pinnedCount = useMemo(() => conversations.filter((c) => c.isPinned).length, [conversations]);

  // The limit only ever blocks *adding* a pin — unpinning is always
  // allowed unconditionally, so there's no way to get stuck unable to
  // free up a slot.
  const handleTogglePin = (conv) => {
    if (!conv.isPinned && pinnedCount >= PIN_LIMIT) {
      toast.error(t("flrgpt.history.pinLimitReached", { count: PIN_LIMIT }));
      return;
    }
    onTogglePin(conv.id);
  };

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

          <div className="p-3 pb-0 shrink-0 space-y-2">
            <button
              type="button"
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand/10 text-brand text-xs font-semibold py-2.5 hover:bg-brand/20 transition-colors cursor-pointer"
            >
              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
              {t("flrgpt.history.newChat")}
            </button>

            {sorted.length > 0 && (
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("flrgpt.history.searchPlaceholder")}
                  className="w-full rounded-xl bg-surface-inset pl-8 pr-3 py-2 text-xs text-ink-primary placeholder-ink-muted outline-none focus:ring-2 focus:ring-brand/30 transition-shadow"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
            {sorted.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-ink-muted">{t("flrgpt.history.empty")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-ink-muted">{t("flrgpt.history.noResults")}</p>
              </div>
            ) : (
              filtered.map((conv) => {
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
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
                      isActive ? "bg-brand/10" : "hover:bg-surface-subtle"
                    }`}
                  >
                    <div className="min-w-0 flex items-start gap-1">
                      {conv.isPinned && (
                        <MapPinIconSolid className="h-3 w-3 mt-1 shrink-0 text-brand" />
                      )}
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
                    </div>
                    <RowMenu
                      isPinned={conv.isPinned}
                      onTogglePin={() => handleTogglePin(conv)}
                      onDelete={() => onDelete(conv.id)}
                      t={t}
                    />
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
