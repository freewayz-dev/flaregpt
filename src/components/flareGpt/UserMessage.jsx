import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

// Right-aligned, bg-brand/white text — the same pairing already proven on
// every primary button in this app, so no new contrast question here.
export default function UserMessage({ message }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success(t("navbar.addressCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("navbar.copyFailed"));
    }
  };

  return (
    <div className="group flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
        <div className="rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ClipboardIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
