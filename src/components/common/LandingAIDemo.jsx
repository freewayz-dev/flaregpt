import { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

import MarkdownContent from "@/components/flareGpt/MarkdownContent";
import ThinkingIndicator from "@/components/flareGpt/ThinkingIndicator";
import { streamChatMessage } from "@/services/chatSocket";
import { useAuthStatus } from "@/hooks/useAuthStatus";

// A real, typeable window into FlareGPT's actual response engine — wired
// to the exact same real-time chat socket the signed-in app uses (see
// useFlareGptConversation.js / chatSocket.js), just without any of the
// persistence around it. No conversation is ever created server-side, no
// history survives a refresh, and there's nothing here for the history
// panel/pin/rename machinery to manage — a visitor's demo messages live
// only in this component's own local state for as long as the tab stays
// open, mirroring the real app's own guest behavior exactly (see
// useFlareGptStore.js's partialize, which persists nothing for a guest
// there either).
//
// The three default prompts are deliberately the ones that don't need a
// wallet — the goal is a visitor's first tap landing on a real, rich
// answer, not a "connect a wallet" fallback. Typing "analyze my wallet"
// still works and still gets the same honest "provide an address" reply
// the real app gives a guest — nothing here fakes a connected wallet to
// force a richer response.
//
// This page isn't part of the i18n pipeline (see LandingPage.jsx), so
// every string here is plain English rather than a t() call, same as the
// rest of this file always was.
const DEMO_PROMPTS = [
  { id: "increaseRewards", label: "How can I increase my FTSO rewards?" },
  { id: "compareProtocols", label: "Compare Sceptre vs Firelight" },
  { id: "stakingOpportunities", label: "Show my staking opportunities" },
  { id: "flareCommunity", label: "What's the latest on Flare / Flare community?" },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function blocksToText(blocks) {
  return (blocks ?? []).map((b) => b.markdown).join("\n\n");
}

export default function LandingAIDemo({ onOpenWalletModal }) {
  const { hasSession, isConnected, isAuthenticating, signIn } = useAuthStatus();
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [value, setValue] = useState("");
  const streamRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    return () => streamRef.current?.cancel();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSend = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    // Only ever local — nothing here is the server's own conversation
    // memory (no conversation_id exists for a demo), so continuity across
    // the visitor's turns in this one session comes entirely from resending
    // this, the same way a guest in the real app works.
    const history = messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? m.content : blocksToText(m.blocks),
    }));

    const userMessage = { id: makeId(), role: "user", content: trimmed };
    const assistantMessage = { id: makeId(), role: "assistant", status: "thinking", blocks: [] };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);
    setValue("");

    const updateAssistant = (patch) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantMessage.id ? { ...m, ...patch } : m)));

    let fullText = "";
    streamRef.current = streamChatMessage(trimmed, {
      history,
      onStatus: (label) => updateAssistant({ statusText: label }),
      onToken: (chunk) => {
        fullText += chunk;
        updateAssistant({ status: "streaming", blocks: [{ type: "text", markdown: fullText }] });
      },
      onDone: () => {
        updateAssistant({ status: "complete", statusText: null });
        setIsGenerating(false);
      },
      onError: () => {
        updateAssistant({
          status: "complete",
          statusText: null,
          blocks: [{ type: "text", markdown: "Something went wrong on this demo. Please try again." }],
        });
        setIsGenerating(false);
      },
    });
  };

  const handleGuestCta = () => {
    if (!isConnected) {
      onOpenWalletModal?.();
      return;
    }
    signIn();
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
      <div className="h-[340px] overflow-y-auto px-4 py-4 scrollbar-none sm:h-[380px]">
        {!hasMessages ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-ink-secondary">
              Ask a real question. This is FlareGPT's actual AI, live.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {DEMO_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSend(p.label)}
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
                      <ThinkingIndicator label={message.statusText} />
                    ) : (
                      <div className="space-y-2.5">
                        {message.blocks.map((block, i) => (
                          <MarkdownContent key={i} markdown={block.markdown} />
                        ))}
                        {message.status === "streaming" && (
                          <span className="inline-block h-3.5 w-1.5 bg-brand/60 animate-pulse rounded-sm align-middle" />
                        )}
                      </div>
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

        {/* Same quiet, single-line convention as the real app's guest
            caption (see GuestModeCaption.jsx) — a returning visitor who
            already has a session from a prior visit sees the plain "demo
            only" line instead, since telling an already-signed-in person
            to "sign in" would just be confusing. */}
        {!hasSession ? (
          <p className="mt-2 text-center text-[10px] text-ink-muted">
            Guest mode · Not saved.{" "}
            <button
              type="button"
              onClick={handleGuestCta}
              disabled={isAuthenticating}
              className="font-medium text-brand-text hover:underline disabled:opacity-70 cursor-pointer"
            >
              {isAuthenticating ? "Confirm in your wallet…" : "Sign in for the full app"}
            </button>
          </p>
        ) : (
          <p className="mt-2 text-center text-[10px] text-ink-muted">
            Demo only. Not saved to your account. Open the app for your real conversation history.
          </p>
        )}
      </div>
    </div>
  );
}
