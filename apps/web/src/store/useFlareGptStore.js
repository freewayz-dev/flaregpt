
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useAuthStore } from "@/store/useAuthStore";

// Real assistant replies only ever populate a single "text" block today
// (see useFlareGptConversation.js's toTextBlocks) — AssistantMessage.jsx's
// renderer also understands "walletBadge"/"tokenBadges"/"chart" block
// types for a backend capability that doesn't exist yet (confirmed live:
// the real API never returns them), so those variants are deliberately
// left untyped here rather than guessing shapes with no real usage to
// verify against. Revisit once AssistantMessage.jsx itself converts and
// actually needs them (Phase 3+).










// `updateMessage` is only ever called against the one assistant bubble a
// given requestReply call itself just appended (see
// useFlareGptConversation.js) — never a user message — so the patch is
// typed against AssistantChatMessage specifically rather than the wider
// ChatMessage union.






function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// A handful, not one and not unlimited: one pin forces re-litigating your
// single "most important" thread every time focus shifts across a
// session, which is friction without much upside. Unlimited pins is the
// opposite failure — pin loses its meaning the moment everything can be
// pinned. 3 is the same cap WhatsApp settled on for pinned chats.
const PIN_LIMIT = 3;

// The backend now has a real per-conversation model (list/create/rename/
// delete — see chatService.js and useChatQueries.js), so conversation
// *metadata* (id, title, timestamps, message_count) lives in react-query,
// not here — it's server state with many potential consumers, the same
// reasoning watchlist wallets moved onto react-query for. What stays here
// is: the *active* conversation's live, rendering transcript (`messages`,
// populated via a direct fetch when switching conversations — see
// useFlareGptConversation.js — and mutated optimistically as messages
// send), which conversation is active, and a couple of local-only UI
// preferences (pinned conversation ids) that the backend has no field
// for at all. Shared by both the full FlareGPT page and the side drawer,
// so opening one while a reply is still coming in on the other shows the
// exact same state.
//
// See useAuthStore.ts for why the state creator below needs an explicit
// `: FlareGptState` return annotation — the same `persist` generic-
// inference gap, not anything specific to this store.
export const useFlareGptStore = create()(
  persist(
    (set, get) => ({
      messages: [],

      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),

      isMessagesLoaded: false,
      isLoadingMessages: false,
      beginLoadingMessages: () => set({ isLoadingMessages: true }),
      setMessages: (messages) =>
        set({ messages, isMessagesLoaded: true, isLoadingMessages: false }),
      resetMessagesLoadState: () => set({ isMessagesLoaded: false, isLoadingMessages: false }),

      flareGptWalletMode: "primary",
      flareGptWalletAddress: null,
      setFlareGptWalletContext: (mode, address = null) =>
        set({
          flareGptWalletMode: mode,
          flareGptWalletAddress: mode === "specific" ? address : null,
        }),

      pinnedConversationIds: [],
      togglePinnedConversation: (id) => {
        const { pinnedConversationIds } = get();
        const isPinned = pinnedConversationIds.includes(id);
        if (!isPinned && pinnedConversationIds.length >= PIN_LIMIT) {
          return false;
        }
        set({
          pinnedConversationIds: isPinned
            ? pinnedConversationIds.filter((pinnedId) => pinnedId !== id)
            : [...pinnedConversationIds, id],
        });
        return true;
      },
      unpinConversation: (id) =>
        set((state) => ({
          pinnedConversationIds: state.pinnedConversationIds.filter((pinnedId) => pinnedId !== id),
        })),

      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      updateMessage: (messageId, patch) =>
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id !== messageId || m.role !== "assistant") return m;
            return { ...m, ...(typeof patch === "function" ? patch(m) : patch) };
          }),
        })),

      // Drops the most recent assistant message so "Regenerate" (or a
      // cancelled send with nothing back yet) can re-append a fresh one in
      // its place, rather than stacking duplicates or leaving an empty
      // bubble behind.
      removeLastAssistantMessage: () =>
        set((state) => {
          const lastIndex = state.messages.length - 1;
          if (lastIndex < 0 || state.messages[lastIndex].role !== "assistant") {
            return state;
          }
          return { messages: state.messages.slice(0, lastIndex) };
        }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "flaregpt_chat",
      // The in-flight "streaming"/"thinking" status on a message is a
      // client-only animation state, not something worth resuming mid-fake-
      // stream on a reload — messages persist as their final content, but
      // active status doesn't. `isMessagesLoaded`/`isLoadingMessages` are
      // deliberately excluded too: every fresh page load re-fetches from
      // the backend (the actual source of truth) rather than trusting a
      // stale local flag.
      //
      // A guest's messages and active-conversation id are deliberately
      // never written here at all — a guest has no real conversation id
      // (nothing is ever created server-side for them), and the backend
      // has nowhere to persist their messages either, so writing either to
      // localStorage would just fake a "saved" feeling for something that
      // vanishes the moment this tab closes. Checked at write-time via
      // useAuthStore directly (not a React dependency) since persist's
      // partialize runs outside any component.
      partialize: (state) => {
        const hasSession = Boolean(useAuthStore.getState().token);
        return {
          messages: hasSession
            ? state.messages.map((m) =>
                m.role === "assistant" && (m.status === "streaming" || m.status === "thinking")
                  ? { ...m, status: "complete" }
                  : m,
              )
            : [],
          activeConversationId: hasSession ? state.activeConversationId : null,
          flareGptWalletMode: state.flareGptWalletMode,
          flareGptWalletAddress: state.flareGptWalletAddress,
          pinnedConversationIds: state.pinnedConversationIds,
        };
      },
    },
  ),
);

// Shared with useFlareGptConversation.ts's own `isGenerating` (same exact
// derivation, single-sourced) and with the PWA update-prompt's safe-reload
// check (src/components/common/UpdateAvailableToast.tsx) — an update must
// never trigger `skipWaiting` while this is true, since that would tear
// down the live chat WebSocket mid-answer. The update prompt lives outside
// any component's render (it's driven by `registerSW`'s own callback), so
// it needs a plain function it can call against `useFlareGptStore.
// getState()` directly, not a hook.
export function isChatGenerating(messages) {
  const lastMessage = messages[messages.length - 1];
  return lastMessage?.role === "assistant" && lastMessage.status !== "complete";
}

export { makeId, PIN_LIMIT };
