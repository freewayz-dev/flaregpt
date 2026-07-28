import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { useFlareGptStore, makeId } from "@/store/useFlareGptStore";
import { useAuthStore } from "@/store/useAuthStore";
import * as chatService from "@/services/chatService";
import { useFlareGptWalletContext } from "@/hooks/useFlareGptWalletContext";

// Real assistant replies are one flat string (see chatService.js), but
// AssistantMessage.jsx renders a `blocks` array (it also knows how to
// render walletBadge/tokenBadges/chart blocks — none of which the real API
// returns today). Wrapping the string in a single text block reuses that
// renderer as-is instead of forking it for "real" vs. "placeholder" replies.
function toTextBlocks(markdown) {
  return [{ type: "text", markdown }];
}

function blocksToText(blocks) {
  return (blocks ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.markdown)
    .join("\n\n");
}

// The backend has no per-message id, so hydrated history entries get a
// fresh local one — nothing here ever needs to reference them by their
// (nonexistent) server id, only the whole-history clear endpoint exists.
function fromHistoryEntry(entry) {
  const base = {
    id: makeId(),
    role: entry.role,
    status: "complete",
    createdAt: entry.timestamp ? entry.timestamp * 1000 : Date.now(),
  };
  return entry.role === "user"
    ? { ...base, content: entry.content }
    : { ...base, blocks: toTextBlocks(entry.content) };
}

// Orchestrates the real send/receive flow on top of the shared
// useFlareGptStore. Both the full page and the drawer call this hook
// independently, but since they read/write the same store, starting a
// message in one and switching to the other mid-request shows the same
// state.
export function useFlareGptConversation() {
  const { t } = useTranslation();
  const messages = useFlareGptStore((s) => s.messages);
  const isLoadingHistory = useFlareGptStore((s) => s.isLoadingHistory);
  const isHistoryLoaded = useFlareGptStore((s) => s.isHistoryLoaded);
  const appendMessage = useFlareGptStore((s) => s.appendMessage);
  const updateMessage = useFlareGptStore((s) => s.updateMessage);
  const removeLastAssistantMessage = useFlareGptStore((s) => s.removeLastAssistantMessage);
  const clearMessages = useFlareGptStore((s) => s.clearMessages);

  const { effectiveAddress } = useFlareGptWalletContext();

  // A guest (no auth session) gets the chat interface but nothing is ever
  // fetched or persisted for them — GET/DELETE /chat/history both require
  // a session (confirmed against the live backend: 401 without one), and
  // there's no server-side place to save their messages either way.
  const hasSession = useAuthStore((s) => Boolean(s.token));

  const lastMessage = messages[messages.length - 1];
  const isGenerating = lastMessage?.role === "assistant" && lastMessage.status !== "complete";

  // Signing in mid-session (started as a guest, then connected + signed)
  // must discard whatever ephemeral, never-persisted transcript was on
  // screen in favor of the real, backend-held one — otherwise the effect
  // below would see isHistoryLoaded already true (set by the guest branch)
  // and never fetch the account's actual history at all. Signing out does
  // the same in reverse: the messages on screen belonged to that account,
  // and leaving them visible under what's now a guest session is stale at
  // best and a privacy leak on a shared device at worst.
  const prevHasSessionRef = useRef(hasSession);
  useEffect(() => {
    const prevHasSession = prevHasSessionRef.current;
    prevHasSessionRef.current = hasSession;
    if (hasSession && !prevHasSession) {
      useFlareGptStore.getState().resetHistoryLoadState();
    } else if (!hasSession && prevHasSession) {
      useFlareGptStore.getState().clearMessages();
      useFlareGptStore.getState().resetHistoryLoadState();
    }
  }, [hasSession]);

  // See useFlareGptStore.js — guarded via getState() (not a dependency) so
  // the page and the drawer, both mounted at once, only ever fetch this
  // once between them, the same pattern useAuthSync.js uses for its
  // once-per-load session check.
  useEffect(() => {
    if (useFlareGptStore.getState().isHistoryLoaded || useFlareGptStore.getState().isLoadingHistory) {
      return;
    }
    if (!hasSession) {
      // Nothing to fetch for a guest — mark "loaded" immediately (with
      // whatever's already in memory) so the UI is ready to use right
      // away instead of showing a spinner for a network call that would
      // only ever 401.
      useFlareGptStore.getState().setMessages(useFlareGptStore.getState().messages);
      return;
    }
    useFlareGptStore.getState().beginLoadingHistory();
    chatService
      .fetchChatHistory()
      .then(({ history }) => {
        useFlareGptStore.getState().setMessages((history ?? []).map(fromHistoryEntry));
      })
      .catch(() => {
        // Falls back to whatever this browser had cached locally (from the
        // persist middleware) rather than blanking the screen — but still
        // marks history "loaded" so a transient failure doesn't retry in a
        // loop on every render.
        useFlareGptStore.getState().setMessages(useFlareGptStore.getState().messages);
        toast.error(t("flrgpt.historyLoadFailed"));
      });
  }, [hasSession, t]);

  // Bumped only when *this* view's user explicitly sends or regenerates —
  // MessageList uses it to force a jump to the bottom that overrides
  // wherever they'd scrolled to, as distinct from the passive "keep
  // following if already at the bottom" behavior it uses for every other
  // update (including this same message continuing to stream in).
  const [scrollRequestId, setScrollRequestId] = useState(0);
  const requestScrollToBottom = () => setScrollRequestId((n) => n + 1);

  // Bumped whenever chat is cleared — Composer watches this to return
  // keyboard focus to itself, so "Clear Chat" feels like one continuous
  // action rather than requiring a manual re-click into the input after.
  const [focusRequestId, setFocusRequestId] = useState(0);

  // Tracks the in-flight request so Stop can actually cancel it (there's no
  // streaming to fast-forward — the real endpoint returns one full reply —
  // so "stop" just means "cancel and remove the pending bubble").
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const requestReply = async (userText, historyMessages) => {
    const assistantMessage = {
      id: makeId(),
      role: "assistant",
      status: "thinking",
      createdAt: Date.now(),
      blocks: [],
    };
    appendMessage(assistantMessage);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const historyPayload = historyMessages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? m.content : blocksToText(m.blocks),
    }));

    try {
      const { response } = await chatService.sendChatMessage(
        userText,
        historyPayload,
        controller.signal,
      );
      updateMessage(assistantMessage.id, {
        status: "complete",
        blocks: toTextBlocks(response),
      });
    } catch (error) {
      if (error.code === "ERR_CANCELED") return; // stop() already handled the message
      removeLastAssistantMessage();
      toast.error(t("flrgpt.sendError"));
    } finally {
      abortControllerRef.current = null;
    }
  };

  const send = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    // Belt-and-suspenders: Composer already disables itself while history
    // is loading, but a send here would race the hydration's setMessages
    // (which replaces the array wholesale) and could vanish the moment it
    // resolves.
    if (useFlareGptStore.getState().isLoadingHistory && !useFlareGptStore.getState().isHistoryLoaded) {
      return;
    }
    requestScrollToBottom();

    const historyForRequest = messages;
    const userMessage = {
      id: makeId(),
      role: "user",
      status: "complete",
      createdAt: Date.now(),
      content: trimmed,
    };
    appendMessage(userMessage);

    requestReply(trimmed, historyForRequest);
  };

  const stop = () => {
    abortControllerRef.current?.abort();
    removeLastAssistantMessage();
  };

  const regenerate = () => {
    if (isGenerating) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const lastUser = messages[messages.length - 1 - lastUserIndex];
    const historyBeforeLastUser = messages.slice(0, messages.length - 1 - lastUserIndex);

    requestScrollToBottom();
    removeLastAssistantMessage();
    requestReply(lastUser.content, historyBeforeLastUser);
  };

  const clearChat = async () => {
    // A guest has nothing on the backend to clear (DELETE /chat/history
    // requires a session too) — this is purely a local reset for them.
    if (!hasSession) {
      clearMessages();
      setFocusRequestId((n) => n + 1);
      return;
    }
    try {
      await chatService.clearChatHistory();
      clearMessages();
      setFocusRequestId((n) => n + 1);
    } catch {
      toast.error(t("flrgpt.clearChat.failed"));
    }
  };

  return {
    messages,
    isGenerating,
    isLoadingHistory: isLoadingHistory && !isHistoryLoaded,
    send,
    stop,
    regenerate,
    clearChat,
    scrollRequestId,
    focusRequestId,
  };
}
