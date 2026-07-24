import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/outline";

import WalletContextPill from "@/components/flareGpt/WalletContextPill";

const MAX_TEXTAREA_HEIGHT = 160;

export default function Composer({ onSend, isGenerating, onStop, onOpenWalletModal }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const canSend = value.trim().length > 0 && !isGenerating;

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    autoGrow(e.target);
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-line p-3 sm:p-4 shrink-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2">
          <WalletContextPill onOpenWalletModal={onOpenWalletModal} />
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-[#E5E7EB] dark:border-none bg-surface-inset p-2 focus-within:ring-2 focus-within:ring-brand/30 transition-shadow">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("flrgpt.composer.placeholder")}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              title={t("flrgpt.composer.stop")}
              className="shrink-0 p-2.5 rounded-xl bg-ink-primary text-surface-card hover:opacity-90 transition-opacity cursor-pointer"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={handleSend}
              title={t("flrgpt.composer.send")}
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
