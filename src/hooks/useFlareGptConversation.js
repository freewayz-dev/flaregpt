import { useEffect, useMemo, useRef } from "react";

import { useFlareGptStore, makeId } from "@/store/useFlareGptStore";
import { getPlaceholderResponse, matchPromptId } from "@/data/flareGptPrompts";
import { useFlareGptWalletContext } from "@/hooks/useFlareGptWalletContext";

const THINKING_DELAY_MS = 650;
const WORD_CHUNK_DELAY_MS = 45;
const WORDS_PER_CHUNK = 3;
const BLOCK_GAP_MS = 220;

function splitWords(markdown) {
  return markdown.split(/(\s+)/); // keep whitespace tokens so re-joining is exact
}

// Orchestrates the placeholder "generation" — thinking delay, then a
// simulated word-by-word reveal of each response block — on top of the
// shared useFlareGptStore. Both the full page and the drawer call this
// hook independently, but since they read/write the same store, starting
// a message in one and switching to the other mid-stream shows the same
// state; only the reveal *animation* is owned by whichever instance
// started it (see the unmount handling below).
export function useFlareGptConversation() {
  const conversations = useFlareGptStore((s) => s.conversations);
  const activeConversationId = useFlareGptStore((s) => s.activeConversationId);
  const storeSendMessage = useFlareGptStore((s) => s.sendMessage);
  const updateMessage = useFlareGptStore((s) => s.updateMessage);
  const removeLastAssistantMessage = useFlareGptStore((s) => s.removeLastAssistantMessage);
  const startNewConversation = useFlareGptStore((s) => s.startNewConversation);
  const switchConversation = useFlareGptStore((s) => s.switchConversation);
  const deleteConversation = useFlareGptStore((s) => s.deleteConversation);
  const togglePinConversation = useFlareGptStore((s) => s.togglePinConversation);

  const { effectiveAddress, effectiveWallet } = useFlareGptWalletContext();

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );
  const messages = activeConversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const isGenerating = lastMessage?.role === "assistant" && lastMessage.status !== "complete";

  // Tracks the in-flight reveal so it can be cancelled (Stop) or fast-
  // forwarded (unmount) without leaving a message stuck mid-stream.
  const timerRef = useRef(null);
  const cancelRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  // If the component driving the animation unmounts mid-stream (e.g. the
  // user navigates from the drawer to the full page), instantly reveal
  // the rest rather than leaving the message frozen at "thinking" forever
  // — approximates "the response kept generating in the background".
  useEffect(() => {
    return () => {
      clearTimer();
      cancelRef.current?.(true);
    };
  }, []);

  const runReveal = (conversationId, messageId, blocks) => {
    let cancelled = false;
    // `revealed` is the actual source of truth for "Stop" — a real Stop
    // button halts generation where it is, it doesn't secretly finish the
    // response for you. If the current block is text mid-reveal, its
    // partial content is completed to a full sentence-shaped block rather
    // than left cut off mid-word, but nothing beyond that point is added.
    // The one exception is unmount (see the effect above): there,
    // finishing fully approximates "it kept generating in the background"
    // instead, which is why that path is a separate call in generateResponse.
    let revealed = [];
    let currentPartialBlock = null;

    cancelRef.current = (finishInstantly) => {
      cancelled = true;
      if (!finishInstantly) return;
      if (currentPartialBlock) currentPartialBlock.markdown = currentPartialBlock.fullMarkdown;
      updateMessage(conversationId, messageId, { blocks: [...revealed], status: "complete" });
    };

    let blockIndex = 0;

    const revealNextBlock = () => {
      if (cancelled) return;
      if (blockIndex >= blocks.length) {
        updateMessage(conversationId, messageId, { status: "complete" });
        return;
      }
      const block = blocks[blockIndex];
      blockIndex += 1;

      if (block.type !== "text") {
        currentPartialBlock = null;
        revealed.push(block);
        updateMessage(conversationId, messageId, {
          status: "streaming",
          blocks: [...revealed],
        });
        timerRef.current = setTimeout(revealNextBlock, BLOCK_GAP_MS);
        return;
      }

      const words = splitWords(block.markdown);
      let wordIndex = 0;
      const partialBlock = { type: "text", markdown: "", fullMarkdown: block.markdown };
      currentPartialBlock = partialBlock;
      revealed.push(partialBlock);

      const revealNextChunk = () => {
        if (cancelled) return;
        wordIndex = Math.min(wordIndex + WORDS_PER_CHUNK * 2, words.length);
        partialBlock.markdown = words.slice(0, wordIndex).join("");
        updateMessage(conversationId, messageId, {
          status: "streaming",
          blocks: [...revealed],
        });
        if (wordIndex < words.length) {
          timerRef.current = setTimeout(revealNextChunk, WORD_CHUNK_DELAY_MS);
        } else {
          timerRef.current = setTimeout(revealNextBlock, BLOCK_GAP_MS);
        }
      };

      revealNextChunk();
    };

    revealNextBlock();
  };

  const generateResponse = (conversationId, promptId) => {
    const assistantMessage = {
      id: makeId(),
      role: "assistant",
      status: "thinking",
      createdAt: Date.now(),
      blocks: [],
    };
    storeSendMessage(assistantMessage);

    timerRef.current = setTimeout(() => {
      const blocks = getPlaceholderResponse(promptId, effectiveWallet);
      runReveal(conversationId, assistantMessage.id, blocks);
    }, THINKING_DELAY_MS);
  };

  const send = (text, explicitPromptId) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    const userMessage = {
      id: makeId(),
      role: "user",
      status: "complete",
      createdAt: Date.now(),
      content: trimmed,
    };
    const conversationId = storeSendMessage(userMessage, effectiveAddress);

    const promptId = explicitPromptId ?? matchPromptId(trimmed);
    generateResponse(conversationId, promptId);
  };

  const stop = () => {
    clearTimer();
    cancelRef.current?.(true);
  };

  const regenerate = () => {
    if (!activeConversation || isGenerating) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    removeLastAssistantMessage(activeConversation.id);
    const promptId = matchPromptId(lastUser.content);
    generateResponse(activeConversation.id, promptId);
  };

  return {
    conversations,
    activeConversation,
    messages,
    isGenerating,
    send,
    stop,
    regenerate,
    startNewConversation,
    switchConversation,
    deleteConversation,
    togglePinConversation,
  };
}
