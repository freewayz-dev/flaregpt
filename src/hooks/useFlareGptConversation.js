import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { useFlareGptStore, makeId } from "@/store/useFlareGptStore";
import { useAuthStore } from "@/store/useAuthStore";
import * as chatService from "@/services/chatService";
import { streamChatMessage } from "@/services/chatSocket";
import { queryKeys } from "@/services/queryKeys";
import { useDeleteConversation } from "@/hooks/queries/useChatQueries";
import { useFlareGptWalletContext } from "@/hooks/useFlareGptWalletContext";
import { WALLET_QUERY_RESILIENCE } from "@/hooks/queries/resilience";

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

// The backend has no per-message id, so every hydrated entry gets a fresh
// local one — nothing here ever needs to reference them by their
// (nonexistent) server id.
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

// A brand-new conversation is titled from the user's own first message
// rather than left as the backend's generic "New Chat" default — with
// potentially dozens of threads in the switcher, a wall of identical
// "New Chat" entries would defeat the point of having titles at all.
// Kept safely under the backend's 80-char cap.
function deriveTitleFromMessage(text) {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return collapsed.length > 60 ? `${collapsed.slice(0, 57)}...` : collapsed;
}

// Distinguishes "the user hit Stop" from a genuine stream failure inside
// requestReply's catch block — stop() already did the cleanup (removing
// the bubble), so this just needs to short-circuit the error toast/rollback
// path rather than double-handle it.
class ChatCancelled extends Error {}

// The backend has no structured wallet-address field on the chat endpoint
// at all (confirmed live) — the only way it ever reasons about a specific
// wallet is by parsing one out of the message text itself, and it already
// defaults to the authenticated wallet with zero hint needed. So this only
// ever needs to fire for the "Specific" case (a watchlist wallet, not the
// connected one) — injecting a reference for Primary would just be a
// redundant hint the backend doesn't need. Applied only to the outgoing
// network payload, never to what's actually displayed in the transcript,
// so the user's own bubble always shows exactly what they typed.
function withWalletContext(text, effectiveWallet) {
  if (!effectiveWallet || effectiveWallet.type !== "tracked") return text;
  return `Regarding wallet ${effectiveWallet.address}: ${text}`;
}

// Orchestrates the real send/receive flow on top of the shared
// useFlareGptStore. Both the full page and the drawer call this hook
// independently, but since they read/write the same store, starting a
// message in one and switching to the other mid-request shows the same
// state.
export function useFlareGptConversation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const messages = useFlareGptStore((s) => s.messages);
  const isLoadingMessages = useFlareGptStore((s) => s.isLoadingMessages);
  const isMessagesLoaded = useFlareGptStore((s) => s.isMessagesLoaded);
  const activeConversationId = useFlareGptStore((s) => s.activeConversationId);
  const appendMessage = useFlareGptStore((s) => s.appendMessage);
  const updateMessage = useFlareGptStore((s) => s.updateMessage);
  const removeLastAssistantMessage = useFlareGptStore((s) => s.removeLastAssistantMessage);
  const unpinConversation = useFlareGptStore((s) => s.unpinConversation);
  const deleteConversationMutation = useDeleteConversation();
  const { effectiveWallet } = useFlareGptWalletContext();

  // A guest (no auth session) gets the chat interface but nothing is ever
  // fetched, created, or persisted for them — every /chat/conversations*
  // endpoint requires a session (confirmed against the live backend: 401
  // without one), so a guest's chat stays exactly what it always was: one
  // ephemeral, client-context-only thread that never touches the network
  // beyond the single POST /api/v1/chat per message.
  const hasSession = useAuthStore((s) => Boolean(s.token));

  const lastMessage = messages[messages.length - 1];
  const isGenerating = lastMessage?.role === "assistant" && lastMessage.status !== "complete";

  // Signing in mid-session (started as a guest, then connected + signed)
  // must discard whatever ephemeral, never-persisted transcript was on
  // screen in favor of a real conversation — otherwise the effect below
  // would see isMessagesLoaded already true (set by the guest branch) and
  // never load anything real. Signing out does the same in reverse: the
  // messages and active conversation on screen belonged to that account,
  // and leaving them visible under what's now a guest session is stale at
  // best and a privacy leak on a shared device at worst.
  const prevHasSessionRef = useRef(hasSession);
  useEffect(() => {
    const prevHasSession = prevHasSessionRef.current;
    prevHasSessionRef.current = hasSession;
    if (hasSession && !prevHasSession) {
      useFlareGptStore.getState().resetMessagesLoadState();
    } else if (!hasSession && prevHasSession) {
      useFlareGptStore.getState().clearMessages();
      useFlareGptStore.getState().setActiveConversationId(null);
      useFlareGptStore.getState().resetMessagesLoadState();
    }
  }, [hasSession]);

  // Loads whichever conversation is active. Guarded via getState() (not a
  // dependency) so the page and the drawer, both mounted at once, only
  // ever fetch this once between them — the same pattern useAuthSync.js
  // uses for its once-per-load session check. Depends on
  // `activeConversationId` so switching conversations (which resets the
  // loaded/loading flags via switchConversation below) re-triggers this
  // for the newly-selected thread.
  useEffect(() => {
    if (useFlareGptStore.getState().isMessagesLoaded || useFlareGptStore.getState().isLoadingMessages) {
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
    if (!activeConversationId) {
      // A fresh "New Chat" with nothing sent yet — there's genuinely
      // nothing to fetch (see requestReply, which is what actually
      // creates a conversation, on the first real send).
      useFlareGptStore.getState().setMessages([]);
      return;
    }

    // Switching conversations quickly (clicking down the history panel
    // before the previous fetch has resolved) must not let an older,
    // slower fetch land *after* a newer one and overwrite it — showing the
    // wrong thread's messages under the now-active conversation. That's
    // guarded below by comparing the *live* active conversation id against
    // the one this specific effect run started for, at the moment the
    // fetch actually settles — not by aborting the request. An
    // AbortController used to do that job here, but it actively fought
    // `fetchQuery`'s own deduping: two calls for the same query key share
    // one underlying request, and aborting a controller *we* owned (from
    // an unrelated instance's cleanup — React 18 StrictMode's dev-only
    // mount→cleanup→mount is the common case, but the page and widget both
    // mounting at once could hit the same thing) killed the one shared
    // request every other caller was also depending on, without
    // react-query's own bookkeeping ever finding out — surfacing as a
    // spurious "couldn't load" error even though nothing had actually
    // failed. Letting react-query own the request's `signal` (passed into
    // the queryFn below) instead of a manually-created one sidesteps that
    // entirely: a same-key duplicate call just awaits the one real fetch,
    // and only a genuine conversation switch (a different query key) is
    // ever treated as "this result is stale, discard it."
    //
    // Routed through `queryClient.fetchQuery` (react-query's imperative,
    // cache-aware fetch) rather than calling `chatService.fetchConversation`
    // directly — this is deliberately NOT a `useQuery()` hook: the fetched
    // history only ever *seeds* local state that a live stream then mutates
    // turn by turn (see requestReply's `updateMessage`/`appendMessage`
    // calls), so a reactive hook that could silently refetch and overwrite
    // that in-progress local state (on window refocus, reconnect, remount)
    // would risk clobbering an active reply mid-stream — exactly the
    // failure mode `refetchOnWindowFocus: true` (see main.jsx) was turned
    // on globally to *fix* everywhere else. `fetchQuery` gives this the
    // same shared retry/backoff every other query in the app gets (this
    // had none before) and makes deleting a conversation's cache entry
    // (see useDeleteConversation's `removeQueries` call, which referenced
    // this exact key even before this) actually evict something, without
    // taking on any of the automatic-refetch risk. No explicit `staleTime`
    // — deliberately always a real fetch on every switch, matching the
    // original "no second client-side cache to go stale, same cost as
    // opening a different email" reasoning, since another device/tab could
    // have added messages to this conversation since it was last opened.
    const conversationIdAtStart = activeConversationId;
    useFlareGptStore.getState().beginLoadingMessages();
    queryClient
      .fetchQuery({
        queryKey: queryKeys.chat.conversation(activeConversationId),
        queryFn: ({ signal }) => chatService.fetchConversation(activeConversationId, signal),
        ...WALLET_QUERY_RESILIENCE,
      })
      .then((conversation) => {
        if (useFlareGptStore.getState().activeConversationId !== conversationIdAtStart) return;
        useFlareGptStore.getState().setMessages((conversation.messages ?? []).map(fromHistoryEntry));
      })
      .catch((error) => {
        if (useFlareGptStore.getState().activeConversationId !== conversationIdAtStart) return;
        if (error?.response?.status === 404) {
          // Deleted elsewhere (another tab, another device) — fall back to
          // a blank "new chat" state rather than showing a dead reference
          // forever.
          useFlareGptStore.getState().setActiveConversationId(null);
          useFlareGptStore.getState().setMessages([]);
          return;
        }
        // Falls back to whatever this browser had cached locally (from the
        // persist middleware) rather than blanking the screen — but still
        // marks messages "loaded" so a transient failure doesn't retry in
        // a loop on every render.
        useFlareGptStore.getState().setMessages(useFlareGptStore.getState().messages);
        toast.error(t("flrgpt.historyLoadFailed"));
      });

    return () => {
      // Only reset the loading flags here if this cleanup is running
      // because the active conversation genuinely changed out from under
      // this effect (switchConversation already does this too — it's
      // harmless to repeat) — NOT for a same-conversation StrictMode
      // remount, where the fetch this instance kicked off is still
      // legitimately in flight and the next mount should just fall through
      // the top guard and wait on that same shared promise rather than
      // starting a redundant duplicate.
      if (
        useFlareGptStore.getState().activeConversationId !== conversationIdAtStart &&
        !useFlareGptStore.getState().isMessagesLoaded
      ) {
        useFlareGptStore.getState().resetMessagesLoadState();
      }
    };
  }, [hasSession, activeConversationId, t]);

  // Bumped only when *this* view's user explicitly sends or regenerates —
  // MessageList uses it to force a jump to the bottom that overrides
  // wherever they'd scrolled to, as distinct from the passive "keep
  // following if already at the bottom" behavior it uses for every other
  // update (including this same message continuing to stream in).
  const [scrollRequestId, setScrollRequestId] = useState(0);
  const requestScrollToBottom = () => setScrollRequestId((n) => n + 1);

  // Bumped whenever chat is cleared, switched, or a new one is started —
  // Composer watches this to return keyboard focus to itself, so these
  // feel like one continuous action rather than requiring a manual
  // re-click into the input after.
  const [focusRequestId, setFocusRequestId] = useState(0);
  const requestFocus = () => setFocusRequestId((n) => n + 1);

  // Tracks the in-flight request so Stop can actually cancel it: `cancelled`
  // guards the lazy conversation-creation step (hitting Stop the instant a
  // brand-new thread's first message is sent must cancel both, not leave an
  // orphaned empty conversation behind from a create call that already
  // landed), `streamHandle` closes the live socket, and `reject` settles the
  // pending promise below so requestReply's own await doesn't hang forever
  // waiting for a `done`/`error` frame that a closed socket will never emit.
  const activeRequestRef = useRef(null);

  useEffect(() => {
    return () => activeRequestRef.current?.streamHandle?.cancel();
  }, []);

  const requestReply = async (userText, guestHistory) => {
    const assistantMessage = {
      id: makeId(),
      role: "assistant",
      status: "thinking",
      createdAt: Date.now(),
      blocks: [],
    };
    appendMessage(assistantMessage);

    const requestState = { cancelled: false, streamHandle: null, reject: null };
    activeRequestRef.current = requestState;

    // Tracks whether *this* call is the one that created the conversation
    // (as opposed to sending into one that already existed) — needed so a
    // failed send can be rolled back below without also rolling back a
    // conversation that had real prior messages.
    let justCreatedConversationId = null;

    try {
      let conversationId = useFlareGptStore.getState().activeConversationId;

      if (hasSession && !conversationId) {
        // Lazy creation: nothing is created server-side just for clicking
        // "New Chat" (see startNewChat) — only a genuine first message in
        // a fresh thread ever calls this, so a curious click that goes
        // nowhere never leaves an empty conversation behind.
        const created = await chatService.createConversation(deriveTitleFromMessage(userText));
        if (requestState.cancelled) return;
        conversationId = created.id;
        justCreatedConversationId = conversationId;
        useFlareGptStore.getState().setActiveConversationId(conversationId);
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      }

      // Once a conversation exists, the socket recalls its own server-side
      // context the same way REST already did (confirmed live: a follow-up
      // sent with only `conversation_id` — no `history` — still correctly
      // recalled prior turns) — `history` only matters for a guest, where
      // the client is the only place that context lives at all.
      let fullText = "";
      await new Promise((resolve, reject) => {
        requestState.reject = reject;
        requestState.streamHandle = streamChatMessage(withWalletContext(userText, effectiveWallet), {
          address: effectiveWallet?.address,
          conversationId: hasSession ? conversationId : null,
          history: hasSession ? undefined : guestHistory,
          onStatus: (label) => updateMessage(assistantMessage.id, { statusText: label }),
          onToken: (chunk) => {
            fullText += chunk;
            updateMessage(assistantMessage.id, { status: "streaming", blocks: toTextBlocks(fullText) });
          },
          onDone: resolve,
          onError: reject,
        });
      });

      updateMessage(assistantMessage.id, { status: "complete", statusText: null });

      // Keeps the switcher's message_count/updated_at (and therefore
      // recency ordering) current without a manual refresh.
      if (hasSession) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      }
    } catch (error) {
      if (error instanceof ChatCancelled) return; // stop() already handled the message

      removeLastAssistantMessage();

      if (justCreatedConversationId) {
        // The conversation only exists because *this* call just created it
        // — if the actual message never landed, leaving that empty, titled
        // conversation behind would be indistinguishable from a real thread
        // the next time it's opened (it would fetch back `messages: []`
        // and silently show the "new chat" greeting again, exactly as if
        // nothing was ever wrong). Rolling it back — best-effort, and
        // resetting the active id back to null — is what keeps a failed
        // first send from leaving any trace at all, matching "nothing is
        // created until a message actually succeeds."
        useFlareGptStore.getState().setActiveConversationId(null);
        chatService.deleteConversation(justCreatedConversationId).catch(() => {});
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      }

      toast.error(t("flrgpt.sendError"));
    } finally {
      activeRequestRef.current = null;
    }
  };

  const send = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    // Belt-and-suspenders: Composer already disables itself while messages
    // are loading, but a send here would race the hydration's setMessages
    // (which replaces the array wholesale) and could vanish the moment it
    // resolves.
    if (useFlareGptStore.getState().isLoadingMessages && !useFlareGptStore.getState().isMessagesLoaded) {
      return;
    }
    requestScrollToBottom();

    // Only ever actually used for a guest send — an authenticated one
    // relies on the backend's own conversation memory instead (see
    // chatService.sendChatMessage).
    const historyForRequest = messages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? m.content : blocksToText(m.blocks),
    }));

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
    const requestState = activeRequestRef.current;
    if (requestState) {
      requestState.cancelled = true;
      requestState.streamHandle?.cancel();
      requestState.reject?.(new ChatCancelled());
    }
    removeLastAssistantMessage();
  };

  // Re-asks the same question in place of the last reply. For an
  // authenticated conversation this still lands as a genuinely new turn
  // server-side (there's no "replace the last answer" endpoint) — the
  // original question and answer stay in the conversation's real history
  // even though this view only ever shows the latest reply locally. That's
  // an accepted tradeoff of there being no purpose-built regenerate
  // endpoint, not a bug: reopening this conversation later would show
  // both attempts, which is honest about what actually happened rather
  // than silently rewriting history.
  const regenerate = () => {
    if (isGenerating) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const lastUser = messages[messages.length - 1 - lastUserIndex];
    const historyBeforeLastUser = messages
      .slice(0, messages.length - 1 - lastUserIndex)
      .map((m) => ({
        role: m.role,
        content: m.role === "user" ? m.content : blocksToText(m.blocks),
      }));

    requestScrollToBottom();
    removeLastAssistantMessage();
    requestReply(lastUser.content, historyBeforeLastUser);
  };

  // Starts a blank thread without touching the backend at all — the
  // conversation this leaves behind (if any) simply stays in history,
  // untouched; nothing is created until an actual message is sent in the
  // new one (see requestReply).
  const startNewChat = () => {
    if (isGenerating) return;
    useFlareGptStore.getState().setActiveConversationId(null);
    useFlareGptStore.getState().setMessages([]);
    requestFocus();
  };

  // Switching conversations always re-fetches that thread's messages
  // fresh (no second client-side cache to go stale) — the same network
  // cost as opening a different email in an inbox, not "unnecessary."
  const switchConversation = (conversationId) => {
    if (conversationId === activeConversationId || isGenerating) return;
    useFlareGptStore.getState().setActiveConversationId(conversationId);
    useFlareGptStore.getState().resetMessagesLoadState();
  };

  // Deletes a specific conversation — used both by the header's per-thread
  // trash action (no id given: targets whatever's currently open) and by
  // the history panel's per-row delete (an explicit id, which may not be
  // the one currently open). Distinct from "New Chat" (leaves the current
  // thread untouched in history) and from Settings > Data & Storage's
  // "delete everything." Only resets the active view if the conversation
  // being deleted is actually the one open right now — removing some other
  // thread from the panel shouldn't disturb what you're currently reading.
  // A guest, or a fresh thread with nothing sent yet, has nothing
  // server-side to delete either way.
  const deleteConversation = async (id = activeConversationId) => {
    const isActive = id === activeConversationId;
    if (isActive) stop();
    if (!hasSession || !id) {
      if (isActive) startNewChat();
      return;
    }
    try {
      await deleteConversationMutation.mutateAsync(id);
      unpinConversation(id);
      if (isActive) startNewChat();
    } catch (error) {
      if (error?.response?.status === 404) {
        // Already gone — the end state we wanted is already true.
        unpinConversation(id);
        if (isActive) startNewChat();
        return;
      }
      toast.error(t("flrgpt.deleteConversationFailed"));
    }
  };

  return {
    messages,
    isGenerating,
    isLoadingMessages: isLoadingMessages && !isMessagesLoaded,
    activeConversationId,
    hasSession,
    send,
    stop,
    regenerate,
    startNewChat,
    switchConversation,
    deleteConversation,
    scrollRequestId,
    focusRequestId,
    requestFocus,
  };
}
