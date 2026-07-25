import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownIcon } from "@heroicons/react/24/outline";

import UserMessage from "@/components/flareGpt/UserMessage";
import AssistantMessage from "@/components/flareGpt/AssistantMessage";

// Sticky-to-bottom while messages arrive, but the moment the user scrolls
// up to re-read something, auto-scroll stops and a "Jump to latest" pill
// appears instead of yanking them back down — the single most-skipped
// detail in chat UIs, so worth getting right explicitly.
export default function MessageList({ messages, onRegenerate }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAutoScroll(distanceFromBottom < 80);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const lastMessage = messages[messages.length - 1];
  const isActivelyStreaming =
    lastMessage?.role === "assistant" && lastMessage.status !== "complete";

  useEffect(() => {
    // `smooth` re-triggers a fresh scroll animation on every call — fine
    // for a single discrete event (send, switch conversation), but this
    // effect also fires on every ~45ms word-chunk tick while a response
    // streams in, which stacked smooth animations on top of each other
    // and was a real source of scroll jank on long transcripts. Instant
    // scroll during streaming keeps the transcript pinned to the bottom
    // without fighting itself; smooth is reserved for the non-streaming
    // case (e.g. a message that arrives complete in one shot).
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({
        behavior: isActivelyStreaming ? "auto" : "smooth",
      });
    }
    // messages' identity changes on every streamed block update too (the
    // store replaces the array immutably), which is exactly what keeps
    // this scrolling during an in-progress response, not just on send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const scrollToBottom = () => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 scrollbar-none"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 28px)",
          maskImage: "linear-gradient(to bottom, transparent, black 28px)",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {message.role === "user" ? (
                  <UserMessage message={message} />
                ) : (
                  <AssistantMessage
                    message={message}
                    isLast={message.id === lastAssistantId}
                    onRegenerate={onRegenerate}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {!autoScroll && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-surface-card border border-divider px-3 py-1.5 text-xs font-medium text-ink-secondary shadow-lg hover:bg-surface-card-hover transition-colors cursor-pointer"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
          {t("flrgpt.jumpToLatest")}
        </button>
      )}
    </div>
  );
}
