import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ClipboardIcon, CheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

import Logo from "@/assets/icons/fl.png";
import MarkdownContent from "@/components/flareGpt/MarkdownContent";
import WalletAddressBadge from "@/components/flareGpt/WalletAddressBadge";
import TokenBadgesInline from "@/components/flareGpt/TokenBadgesInline";
import ChartBlock from "@/components/flareGpt/ChartBlock";
import ThinkingIndicator from "@/components/flareGpt/ThinkingIndicator";

function renderBlock(block, index) {
  switch (block.type) {
    case "text":
      return <MarkdownContent key={index} markdown={block.markdown} />;
    case "walletBadge":
      return <WalletAddressBadge key={index} address={block.address} />;
    case "tokenBadges":
      return <TokenBadgesInline key={index} symbols={block.symbols} />;
    case "chart":
      return (
        <ChartBlock key={index} points={block.points} trend={block.trend} caption={block.caption} />
      );
    default:
      return null;
  }
}

// Not a bubble — flowing text on the page background with a small avatar,
// matching Claude/ChatGPT's convention rather than a boxed chat bubble, so
// markdown/tables/charts have room to breathe instead of fighting bubble
// padding. Copy and Regenerate are hover-revealed rather than always
// visible, keeping the transcript visually quiet until you need them;
// Regenerate only ever appears on the most recent assistant message
// (re-running an older one would imply a branching history this product
// doesn't have yet).
// Memoized for the same reason as UserMessage: the store only replaces
// the object for the message actively streaming, so unrelated siblings
// (including any embedded ChartBlocks — real recharts SVGs, not cheap to
// re-render) shouldn't re-render on every ~45ms word-chunk tick of the
// active reply.
function AssistantMessage({ message, isLast, onRegenerate }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const isThinking = message.status === "thinking";
  const isStreaming = message.status === "streaming";

  const handleCopy = async () => {
    const text = message.blocks
      .filter((b) => b.type === "text")
      .map((b) => b.markdown)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("flrgpt.actions.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("flrgpt.actions.copyFailed"));
    }
  };

  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-xl bg-brand shadow-sm overflow-hidden mt-0.5">
        <img alt="" src={Logo} className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1 group">
        {isThinking ? (
          <ThinkingIndicator label={message.statusText} />
        ) : (
          <div className="space-y-3">
            {message.blocks.map(renderBlock)}
            {isStreaming && (
              <span className="inline-block h-4 w-1.5 bg-brand/60 animate-pulse rounded-sm align-middle" />
            )}
          </div>
        )}

        {!isThinking && !isStreaming && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              title={t("flrgpt.actions.copy")}
              className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer"
            >
              {copied ? (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ClipboardIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {isLast && (
              <button
                type="button"
                onClick={onRegenerate}
                title={t("flrgpt.actions.regenerate")}
                className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card-hover transition-colors cursor-pointer"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(AssistantMessage);
