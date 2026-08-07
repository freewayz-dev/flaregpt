import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/outline";

import WalletContextPill from "@/components/flareGpt/WalletContextPill";
import GuestModeCaption from "@/components/flareGpt/GuestModeCaption";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const MAX_TEXTAREA_HEIGHT = 160;

interface ComposerProps {
  onSend: (text: string) => void;
  isGenerating: boolean;
  onStop: () => void;
  onOpenWalletModal: () => void;
  focusRequestId: number;
  disabled?: boolean;
}

export default function Composer({
  onSend,
  isGenerating,
  onStop,
  onOpenWalletModal,
  focusRequestId,
  disabled = false,
}: ComposerProps) {
  const { t } = useTranslation();
  const { hasSession } = useAuthStatus();
  // The chat stream is a live WebSocket (see useFlareGptConversation.ts) —
  // there's no service-worker cache tier for it the way there is for
  // financial reads, so offline always means "can't send," not "send a
  // stale copy." Left free to keep typing (the draft isn't lost, and
  // it's still there to send the moment `isOnline` flips back), just
  // blocked from actually submitting.
  const isOnline = useOnlineStatus();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount so the page/widget opens ready to type — but only
  // on desktop. On a touch device, focusing a text input immediately opens
  // the on-screen keyboard and shifts the whole layout the instant the
  // surface appears, before the visitor has actually asked to type
  // anything; that's the opposite of "ready to use," it's a jarring first
  // moment. Same pointer:coarse check used elsewhere in this file for the
  // same reason (blur-on-send).
  useEffect(() => {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) {
      textareaRef.current?.focus();
    }
  }, []);

  // "New Chat" should feel like one seamless action — history panel
  // closes, a blank conversation starts, and the composer is where you'd
  // land next, so focus returns here automatically rather than requiring
  // a manual click back into the input. Same mount-time guard as above:
  // skip on touch devices so tapping "New Chat" doesn't pop the on-screen
  // keyboard as a side effect. Guards against the initial render's default
  // value (0) so this doesn't *also* fire once on mount alongside the
  // effect above.
  useEffect(() => {
    if (!focusRequestId) return;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) {
      textareaRef.current?.focus();
    }
  }, [focusRequestId]);

  const canSend = value.trim().length > 0 && !isGenerating && !disabled && isOnline;

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autoGrow(e.target);
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // On touch devices, refocusing immediately keeps the on-screen
      // keyboard open after send — the opposite of the "return to resting
      // position" feel premium chat apps have. Desktop keeps refocusing
      // so typing the next message doesn't require re-clicking the input.
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      if (isTouchDevice) {
        textareaRef.current.blur();
      } else {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    // A mobile soft keyboard's Enter/Return key is a natural newline key —
    // hijacking it to send would make longer prompts impossible to write
    // without accidentally submitting mid-thought. Desktop keeps the
    // standard chat-app convention (Enter sends, Shift+Enter for a
    // newline); only touch devices get newline-always, send-button-only.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (isTouchDevice) return;
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="border-t border-line px-3 pt-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:p-4 shrink-0">
      <div className="mx-auto max-w-3xl">
        {/* Shown for every visitor, signed in or not — hiding it entirely
            for a guest would hide the capability itself, not just the
            wallet list. WalletContextPill renders its own locked/
            explainer state until `hasSession` is actually true (see that
            component for why connecting alone doesn't count). The guest
            caption stacks below rather than sharing the pill's row — side
            by side, the caption's text was the first thing to wrap
            awkwardly on a narrow phone width. */}
        <div className="mb-2 space-y-1.5">
          <WalletContextPill onOpenWalletModal={onOpenWalletModal} />
          {!hasSession && (
            <GuestModeCaption onOpenWalletModal={onOpenWalletModal} />
          )}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-[#E5E7EB] dark:border-none bg-surface-inset p-1.5 sm:p-2 focus-within:outline focus-within:outline-2 focus-within:outline-brand/50 focus-within:outline-offset-2">
          <textarea
            ref={textareaRef}
            id="flrgpt-composer-input"
            name="message"
            aria-label={t("flrgpt.composer.placeholder")}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={isOnline ? t("flrgpt.composer.placeholder") : t("flrgpt.composer.offlinePlaceholder")}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 sm:py-2 text-base sm:text-sm text-ink-primary placeholder-ink-muted outline-none disabled:opacity-60"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              title={t("flrgpt.composer.stop")}
              aria-label={t("flrgpt.composer.stop")}
              className="shrink-0 p-2.5 rounded-xl bg-ink-primary text-surface-card hover:opacity-90 transition-opacity cursor-pointer"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={handleSend}
              title={isOnline ? t("flrgpt.composer.send") : t("flrgpt.composer.offlinePlaceholder")}
              aria-label={isOnline ? t("flrgpt.composer.send") : t("flrgpt.composer.offlinePlaceholder")}
              className={`shrink-0 p-2.5 rounded-xl transition-colors ${
                canSend
                  ? "bg-brand text-white hover:bg-brand-hover cursor-pointer"
                  : "bg-surface-card-hover text-ink-muted cursor-not-allowed"
              }`}
            >
              <PaperAirplaneIcon className="h-4 w-4 rotate-45" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-muted">
          {t("flrgpt.composer.disclaimer")}
        </p>
      </div>
    </div>
  );
}
