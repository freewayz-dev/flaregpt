import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownIcon } from "@heroicons/react/24/outline";

import UserMessage from "@/components/flareGpt/UserMessage";
import AssistantMessage from "@/components/flareGpt/AssistantMessage";
import type { ChatMessage } from "@/store/useFlareGptStore";

interface MessageListProps {
  messages: ChatMessage[];
  onRegenerate: () => void;
  scrollRequestId: number;
}

// Sticky-to-bottom while messages arrive, but the moment the user scrolls
// up to re-read something, auto-scroll stops and a "Jump to latest" pill
// appears instead of yanking them back down — the single most-skipped
// detail in chat UIs, so worth getting right explicitly.
export default function MessageList({ messages, onRegenerate, scrollRequestId }: MessageListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const announcedIdRef = useRef<string | null>(null);

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

  // Announces once a reply has actually finished, not on every ~45ms
  // streaming chunk — mirroring the raw streaming text into a live region
  // would have a screen reader user's speech interrupted and restarted
  // dozens of times per response, which is worse than saying nothing at
  // all. `announcedIdRef` guards against re-firing for the same message if
  // some unrelated state change causes a re-render after it's already
  // complete.
  useEffect(() => {
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.status === "complete" &&
      announcedIdRef.current !== lastMessage.id
    ) {
      announcedIdRef.current = lastMessage.id;
      setAnnouncement(t("flrgpt.responseReady"));
    }
  }, [lastMessage?.id, lastMessage?.status, lastMessage?.role, t]);

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

  // Sending or regenerating should always land the view at the bottom,
  // even if the user was scrolled up reading older messages — distinct
  // from the effect above, which only *keeps* following if already at
  // the bottom. `scrollRequestId` only bumps for actions *this* user
  // just took (see useFlareGptConversation), so anything that could
  // append messages without that — a hypothetical background update —
  // wouldn't trigger this and would leave their scroll position alone.
  useEffect(() => {
    if (!scrollRequestId) return;
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scrollRequestId]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const scrollToBottom = () => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        role="log"
        aria-label={t("flrgpt.conversationLabel")}
        aria-relevant="additions"
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

      {/* Visually hidden — decoupled from the visible streaming text on
          purpose (see the effect above) so a screen reader only hears
          "FlareGPT has finished responding" once, instead of every token
          as the reply streams in. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
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
