import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

// Future-proofing: no canned placeholder response currently emits a fenced
// code block (there's no natural case for it among the six suggested
// prompts), but a real analysis assistant plausibly will eventually
// (e.g. a delegation script, a query snippet) — syntax highlighting is
// deliberately deferred rather than reached for now, since nothing today
// needs it.
interface CodeBlockProps {
  language?: string;
  children: string;
}

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("navbar.copyFailed"));
    }
  };

  return (
    <div className="overflow-hidden rounded-xl bg-surface-inset border border-divider">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-divider">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t("flrgpt.actions.copy")}
          title={t("flrgpt.actions.copy")}
          className="flex items-center gap-1 text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ClipboardIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed font-mono text-ink-primary scrollbar-none">
        {children}
      </pre>
    </div>
  );
}
