import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

// Right-aligned, bg-brand/white text — the same pairing already proven on
// every primary button in this app, so no new contrast question here.
//
// Memoized because the store only ever replaces the *one* message object
// being streamed — every other message keeps its prior reference — but
// without memo, React would still re-invoke every sibling's render on
// every ~45ms streaming tick of the active response. On a long
// conversation that's redundant work piling up for the entire duration of
// every reply, not just this component's own re-render.
function UserMessage({ message }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success(t("flrgpt.actions.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("flrgpt.actions.copyFailed"));
    }
  };

  return (
    <div className="group flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
        <div className="rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-base leading-7 text-white whitespace-pre-wrap break-words">
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

export default memo(UserMessage);
