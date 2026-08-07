import type { TFunction } from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  PencilSquareIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  MapPinIcon as MapPinIconOutline,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinIconSolid } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";

import { PIN_LIMIT } from "@/store/useFlareGptStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ConversationSummary } from "@/services/chatService";

function formatRelativeTime(unixSeconds: number, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMin = Math.round((unixSeconds * 1000 - Date.now()) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

// Persistent three-dot trigger rather than hover-revealed icons — hover
// isn't a touch-device concept, so those would be undiscoverable on
// mobile until someone happened to tap the row. This works identically
// regardless of input type.
interface RowMenuProps {
  isPinned: boolean;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
  // Pin is purely client-side (see the component-level comment below), so
  // it stays fully usable offline — only rename/delete hit the real
  // endpoint and need gating, the same way Wallets.tsx's watchlist rows
  // gate their own rename/remove buttons.
  offlineBlocked: boolean;
  t: TFunction;
}

function RowMenu({ isPinned, onTogglePin, onRename, onDelete, offlineBlocked, t }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
        aria-label={t("flrgpt.history.moreActions")}
        title={t("flrgpt.history.moreActions")}
        className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      <div
        className={`absolute right-0 top-full mt-1 w-36 rounded-xl border border-line bg-surface-card p-1 shadow-lg z-30 transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "invisible pointer-events-none opacity-0 scale-95"
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
            onRename();
            setOpen(false);
          }}
          disabled={offlineBlocked}
          title={offlineBlocked ? t("flrgpt.history.offline") : undefined}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-surface-inset hover:text-ink-primary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <PencilIcon className="h-3.5 w-3.5 shrink-0" />
          {t("flrgpt.history.rename")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setOpen(false);
          }}
          disabled={offlineBlocked}
          title={offlineBlocked ? t("flrgpt.history.offline") : undefined}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          {t("flrgpt.history.delete")}
        </button>
      </div>
    </div>
  );
}

// An overlay on top of the whole chat pane (message list + composer), not
// a permanent rail squeezing the conversation width — browsing history is
// occasional and transient, so it shouldn't cost a permanently-narrower
// chat the rest of the time. Pin/rename/delete are entirely client-driven
// (pin has no backend field at all — see useFlareGptStore.js — rename and
// delete call the real endpoints via the mutations passed in).
interface ConversationHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  activeConversationId: string | null;
  pinnedIds: string[];
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (id: string) => boolean;
  onRename: (id: string, title: string) => Promise<unknown>;
  onDelete: (id: string) => void;
}

export default function ConversationHistoryPanel({
  open,
  onClose,
  conversations,
  isLoading,
  isError,
  onRetry,
  activeConversationId,
  pinnedIds,
  onSelect,
  onNewChat,
  onTogglePin,
  onRename,
  onDelete,
}: ConversationHistoryPanelProps) {
  const { t, i18n } = useTranslation();
  // Rename/delete both call the real backend (see Flrgpt/index.tsx and
  // FlareWidget.tsx — this panel only ever renders once `hasSession` is
  // true, so there's no local/guest fallback path to fall back to the way
  // Wallets.tsx has). Pin stays unblocked below since it's purely local.
  const isOnline = useOnlineStatus();
  const offlineBlocked = !isOnline;
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // This panel is an absolute overlay that fully replaces the chat pane
  // while open, functioning exactly like a modal even though it's scoped
  // to this one surface — so it gets the same focus handling as every
  // other overlay in this app (ConnectWalletModal, TransactionDrawer):
  // move focus in on open (the close button, always present regardless of
  // whether there's any history yet) so a keyboard/screen-reader user
  // isn't left focused on the now-hidden "History" toggle button while the
  // actually-visible content lives elsewhere; restore it to whatever
  // triggered the open on close, rather than leaving focus wherever it
  // happened to land inside the panel.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeButtonRef.current?.focus();
    } else {
      previouslyFocusedRef.current?.focus?.();
    }
  }, [open]);

  // Matches every other dismissible overlay in the app (ConnectWalletModal,
  // TransactionDrawer, RowMenu above) — a keyboard user shouldn't need to
  // Tab to the close button specifically to get out of this panel.
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setRenamingId(null);
      setIsSavingRename(false);
    }
  }, [open]);

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return b.updated_at - a.updated_at;
      }),
    [conversations, pinnedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => (c.title || t("flrgpt.history.untitled")).toLowerCase().includes(q));
  }, [sorted, query, t]);

  const handleTogglePin = (conv: ConversationSummary) => {
    const ok = onTogglePin(conv.id);
    if (!ok) toast.error(t("flrgpt.history.pinLimitReached", { count: PIN_LIMIT }));
  };

  const startRename = (conv: ConversationSummary) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title || "");
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  // Deliberately no auto-save on blur — the same reasoning as the
  // watchlist's rename flow (see Wallets.jsx): a blur-commit is too easy
  // to trigger by accident on mobile (dismissing the on-screen keyboard,
  // scrolling, tapping an adjacent control), and an explicit Save/Cancel
  // pair is unambiguous on both desktop and touch without needing two
  // different interaction models. Enter still saves and Escape still
  // cancels as shortcuts, but neither is required.
  const commitRename = async () => {
    if (isSavingRename) return;
    const trimmed = renameValue.trim();
    const id = renamingId;
    if (!trimmed || !id) {
      setRenamingId(null);
      return;
    }
    // The Save button below is already disabled via `offlineBlocked` —
    // this guards the same Enter-key path (see the rename input's
    // onKeyDown), which calls this directly and doesn't go through that
    // button at all.
    if (offlineBlocked) {
      toast.error(t("flrgpt.history.offline"));
      return;
    }
    setIsSavingRename(true);
    try {
      await onRename(id, trimmed);
      setRenamingId(null);
    } catch {
      toast.error(t("flrgpt.history.renameFailed"));
    } finally {
      setIsSavingRename(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="flrgpt-history-title"
          className="absolute inset-0 z-20 flex flex-col bg-surface-card"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3 shrink-0">
            <h2 id="flrgpt-history-title" className="text-sm font-semibold text-ink-primary">
              {t("flrgpt.history.title")}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t("flrgpt.history.close")}
              title={t("flrgpt.history.close")}
              className="p-1 rounded-lg hover:bg-surface-subtle text-ink-secondary transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
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
              <PencilSquareIcon className="h-3.5 w-3.5" />
              {t("flrgpt.history.newChat")}
            </button>

            {sorted.length > 0 && (
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                <input
                  type="text"
                  id="flrgpt-history-search"
                  name="search"
                  aria-label={t("flrgpt.history.searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("flrgpt.history.searchPlaceholder")}
                  className="w-full rounded-xl bg-surface-inset pl-8 pr-3 py-2 text-xs text-ink-primary placeholder-ink-muted outline-none focus:ring-2 focus:ring-brand/30 transition-shadow"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
            {isError ? (
              // Checked before `sorted.length === 0` below — without this,
              // a failed (or offline-paused) fetch rendered the exact same
              // "No conversations yet" copy as a genuinely empty account,
              // with no way to tell "you have none" apart from "we couldn't
              // check" and no way to retry.
              <div className="py-10 text-center">
                <p className="text-xs font-medium text-ink-primary">{t("flrgpt.history.loadFailed")}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.common.networkHiccup")}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors cursor-pointer"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  {t("dashboard.common.retry")}
                </button>
              </div>
            ) : isLoading ? (
              <div className="py-10 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand" />
              </div>
            ) : sorted.length === 0 ? (
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
                const isPinned = pinnedIds.includes(conv.id);
                const isRenaming = renamingId === conv.id;
                return (
                  <div
                    key={conv.id}
                    role={isRenaming ? undefined : "button"}
                    tabIndex={isRenaming ? undefined : 0}
                    onClick={isRenaming ? undefined : () => onSelect(conv.id)}
                    onKeyDown={(e) => {
                      if (!isRenaming && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelect(conv.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
                      isRenaming ? "" : "cursor-pointer"
                    } ${isActive ? "bg-brand/10" : isRenaming ? "" : "hover:bg-surface-subtle"}`}
                  >
                    <div className="min-w-0 flex items-start gap-1 flex-1">
                      {isPinned && !isRenaming && (
                        <MapPinIconSolid className="h-3 w-3 mt-1 shrink-0 text-brand" />
                      )}
                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            aria-label={t("flrgpt.history.renameLabel")}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSavingRename}
                            maxLength={80}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename();
                              } else if (e.key === "Escape") {
                                cancelRename();
                              }
                            }}
                            className="block w-full bg-white dark:bg-[#121214] rounded-lg px-2 py-1 text-sm font-medium text-ink-primary outline-none border border-brand/40 disabled:opacity-60"
                          />
                        ) : (
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? "text-brand-text" : "text-ink-primary"
                            }`}
                          >
                            {conv.title || t("flrgpt.history.untitled")}
                          </p>
                        )}
                        {!isRenaming && (
                          <span className="text-[10px] text-ink-muted">
                            {formatRelativeTime(conv.updated_at, i18n.language)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isRenaming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            commitRename();
                          }}
                          disabled={isSavingRename || offlineBlocked}
                          title={offlineBlocked ? t("flrgpt.history.offline") : t("flrgpt.history.saveRename")}
                          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelRename();
                          }}
                          disabled={isSavingRename}
                          title={t("flrgpt.history.cancelRename")}
                          className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <RowMenu
                        isPinned={isPinned}
                        onTogglePin={() => handleTogglePin(conv)}
                        onRename={() => startRename(conv)}
                        onDelete={() => onDelete(conv.id)}
                        offlineBlocked={offlineBlocked}
                        t={t}
                      />
                    )}
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
