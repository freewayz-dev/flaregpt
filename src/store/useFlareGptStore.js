import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useAuthStore } from "@/store/useAuthStore";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// The backend keeps exactly one continuous chat history per account — no
// conversation/thread concept, no per-message id (see chatService.js) — so
// this store mirrors that: one flat `messages` list, not a list of
// conversations. Shared by both the full FlareGPT page and the side
// drawer, so opening one while a reply is still coming in on the other
// shows the exact same state.
export const useFlareGptStore = create()(
  persist(
    (set) => ({
      messages: [],

      // Guards the initial history fetch (see useFlareGptConversation.js)
      // so the page and the drawer — both mountable at once, both calling
      // the same hook — never fetch it twice. Read/written via getState(),
      // never as a hook dependency, same reasoning as useAuthStore's
      // isAuthenticating guard.
      isHistoryLoaded: false,
      isLoadingHistory: false,
      beginLoadingHistory: () => set({ isLoadingHistory: true }),
      setMessages: (messages) =>
        set({ messages, isHistoryLoaded: true, isLoadingHistory: false }),
      // Forces the next mount (or the effect that watches for a fresh
      // sign-in — see useFlareGptConversation.js) to fetch again, rather
      // than trusting a load that happened under a different auth state.
      // A guest's local, in-memory-only transcript is what a sign-in
      // transition needs to discard in favor of the real, persisted one.
      resetHistoryLoadState: () => set({ isHistoryLoaded: false, isLoadingHistory: false }),

      // undefined = user hasn't explicitly chosen an AI wallet context yet
      // (falls back to whatever the dashboard's own active wallet is); a
      // string = a specific address. Kept distinct from
      // useWalletHubStore's activeAddress on purpose — asking FlareGPT
      // about a wallet shouldn't require first switching what the rest of
      // the dashboard is showing.
      aiWalletAddress: undefined,
      setAiWalletAddress: (address) => set({ aiWalletAddress: address }),

      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      updateMessage: (messageId, patch) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
              : m,
          ),
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

      // Local-only clear — callers (Settings > Data & Storage, and the
      // in-chat Clear Chat button) call chatService.clearChatHistory()
      // first and only invoke this once that succeeds, since the backend
      // is the source of truth and has no per-conversation granularity to
      // partially clear.
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "flaregpt_chat",
      // The in-flight "streaming"/"thinking" status on a message is a
      // client-only animation state, not something worth resuming mid-fake-
      // stream on a reload — messages persist as their final content, but
      // active status doesn't. `isHistoryLoaded` is deliberately excluded
      // too: every fresh page load re-fetches from the backend (the actual
      // source of truth) rather than trusting a stale local flag.
      //
      // A guest's messages are deliberately never written here at all —
      // the backend has nowhere to persist them either (GET/DELETE
      // /chat/history both require a session), so writing them to
      // localStorage would just fake a "saved" feeling for something that
      // vanishes the moment this tab closes. Checked at write-time via
      // useAuthStore directly (not a React dependency) since persist's
      // partialize runs outside any component.
      partialize: (state) => ({
        messages: useAuthStore.getState().token
          ? state.messages.map((m) =>
              m.status === "streaming" || m.status === "thinking"
                ? { ...m, status: "complete" }
                : m,
            )
          : [],
        aiWalletAddress: state.aiWalletAddress,
      }),
    },
  ),
);

export { makeId };
