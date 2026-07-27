import { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

import MarkdownContent from "@/components/flareGpt/MarkdownContent";
import TokenBadgesInline from "@/components/flareGpt/TokenBadgesInline";
import ChartBlock from "@/components/flareGpt/ChartBlock";
import ThinkingIndicator from "@/components/flareGpt/ThinkingIndicator";
import { getPlaceholderResponse, matchPromptId } from "@/data/flareGptPrompts";

// A real, typeable version of the same placeholder-data conversation the
// full app runs (see useFlareGptConversation) — deliberately a separate,
// self-contained implementation rather than reusing that hook directly,
// since this demo has no wallet context, no persisted history, and no
// Stop/regenerate semantics to support. Local-only state is the point: a
// landing-page visitor's demo messages should never leak into the real
// conversation store a signed-in dashboard session reads from.
//
// The three default prompts are deliberately the ones that don't require a
// wallet (`requiresWallet: false`) — the goal is a visitor's first tap
// landing on a rich, real answer (a table, a list, token badges), not the
// "connect a wallet" fallback. Typing something like "analyze my wallet"
// still works and still shows that real fallback honestly — nothing here
// fakes a connected wallet to force a richer response.
// Labels here match the real app's translated prompt copy (en/common.json
// flrgpt.prompts) verbatim — the landing page isn't part of the i18n
// pipeline (see LandingPage.jsx), so this is a plain English mirror rather
// than a `t()` call, kept in sync manually since it's only 3 short strings.
const DEMO_PROMPTS = [
  { id: "increaseRewards", label: "How can I increase my FTSO rewards?" },
  { id: "compareProtocols", label: "Compare Sceptre vs Firelight" },
  { id: "stakingOpportunities", label: "Show my staking opportunities" },
];

const THINKING_DELAY_MS = 550;
const WORD_CHUNK_DELAY_MS = 40;
const WORDS_PER_CHUNK = 3;
const BLOCK_GAP_MS = 180;

function splitWords(markdown) {
  return markdown.split(/(\s+)/);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function renderBlock(block, index) {
  switch (block.type) {
    case "text":
      return <MarkdownContent key={index} markdown={block.markdown} />;
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

export default function LandingAIDemo() {
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [value, setValue] = useState("");
  const timerRef = useRef(null);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const revealResponse = (messageId, blocks) => {
    let revealed = [];
    let blockIndex = 0;

    const setBlocks = (patch) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      );

    const revealNextBlock = () => {
      if (blockIndex >= blocks.length) {
        setBlocks({ status: "complete" });
        setIsGenerating(false);
        return;
      }
      const block = blocks[blockIndex];
      blockIndex += 1;

      if (block.type !== "text") {
        revealed = [...revealed, block];
        setBlocks({ blocks: revealed });
        timerRef.current = setTimeout(revealNextBlock, BLOCK_GAP_MS);
        return;
      }

      const words = splitWords(block.markdown);
      let wordIndex = 0;
      const partialBlock = { type: "text", markdown: "" };
      revealed = [...revealed, partialBlock];

      const revealNextChunk = () => {
        wordIndex = Math.min(wordIndex + WORDS_PER_CHUNK * 2, words.length);
        partialBlock.markdown = words.slice(0, wordIndex).join("");
        setBlocks({ blocks: [...revealed] });
        timerRef.current = setTimeout(
          wordIndex < words.length ? revealNextChunk : revealNextBlock,
          wordIndex < words.length ? WORD_CHUNK_DELAY_MS : BLOCK_GAP_MS,
        );
      };

      revealNextChunk();
    };

    revealNextBlock();
  };

  const handleSend = (text, explicitPromptId) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    const userMessage = { id: makeId(), role: "user", content: trimmed };
    const assistantMessage = { id: makeId(), role: "assistant", status: "thinking", blocks: [] };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);
    setValue("");

    const promptId = explicitPromptId ?? matchPromptId(trimmed);
    timerRef.current = setTimeout(() => {
      const blocks = getPlaceholderResponse(promptId, null);
      revealResponse(assistantMessage.id, blocks);
    }, THINKING_DELAY_MS);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white/80 shadow-xl backdrop-blur-xl dark:bg-[#111113]/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
            <span className="text-xs font-black text-white">F</span>
          </div>
          <span className="text-sm font-bold text-ink-primary">FlareGPT</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Live demo
        </span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="h-[340px] overflow-y-auto px-4 py-4 scrollbar-none sm:h-[380px]"
      >
        {!hasMessages ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-ink-secondary">
              Try a real question — this is FlareGPT's actual response engine,
              running on demo data.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {DEMO_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSend(p.label, p.id)}
                  className="rounded-xl bg-surface-inset px-3.5 py-2.5 text-left text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-card-hover hover:text-ink-primary cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-3.5 py-2 text-sm text-white">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand">
                    <span className="text-[10px] font-black text-white">F</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {message.status === "thinking" ? (
                      <ThinkingIndicator />
                    ) : (
                      <div className="space-y-2.5">{message.blocks.map(renderBlock)}</div>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-inset p-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-brand/50 focus-within:outline-offset-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend(value);
              }
            }}
            placeholder="Ask FlareGPT..."
            className="flex-1 bg-transparent px-2.5 py-2 text-base sm:text-sm text-ink-primary placeholder-ink-muted outline-none"
          />
          <button
            type="button"
            disabled={!value.trim() || isGenerating}
            onClick={() => handleSend(value)}
            className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              value.trim() && !isGenerating
                ? "bg-brand text-white hover:bg-brand-hover cursor-pointer"
                : "bg-surface-card-hover text-ink-muted cursor-not-allowed"
            }`}
          >
            <PaperAirplaneIcon className="h-4 w-4 rotate-45" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-ink-muted">
          Demo data — connect a wallet in the app for real, personalized answers.
        </p>
      </div>
    </div>
  );
}
