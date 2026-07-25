import { create } from "zustand";
import { persist } from "zustand/middleware";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// A conversation is only created lazily, on the first message — visiting
// the page or opening the drawer never itself creates persisted state, so
// "empty state" and "no conversations yet" stay the same thing rather than
// accumulating blank threads. `walletAddress` is a snapshot of whichever
// wallet was selected when the conversation started (or null for
// "General"), shown in the history list so a returning user can tell which
// thread was about which wallet without opening it.
function makeConversation(walletAddress) {
  return {
    id: makeId(),
    title: null,
    walletAddress: walletAddress ?? null,
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

// Shared by both the full FlareGPT page and the side drawer — a single
// store (not two parallel ones) is what lets "expand" on the drawer
// continue the exact same thread on the full page instead of starting a
// new one.
export const useFlareGptStore = create()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      // undefined = user hasn't explicitly chosen an AI wallet context yet
      // (falls back to whatever the dashboard's own active wallet is);
      // null = explicitly chosen "General (no wallet)"; a string = a
      // specific address. Kept distinct from useWalletHubStore's
      // activeAddress on purpose — asking FlareGPT about a wallet
      // shouldn't require first switching what the rest of the dashboard
      // is showing.
      aiWalletAddress: undefined,
      setAiWalletAddress: (address) => set({ aiWalletAddress: address }),

      startNewConversation: () => set({ activeConversationId: null }),

      switchConversation: (id) => set({ activeConversationId: id }),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        })),

      togglePinConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, isPinned: !c.isPinned } : c,
          ),
        })),

      // Ensures an active conversation exists (creating one scoped to
      // `walletAddress` if needed) and appends `message` to it. Returns the
      // conversation id, since callers (the streaming orchestration hook)
      // need it for subsequent updateMessage calls even when a brand-new
      // conversation was just created.
      sendMessage: (message, walletAddress) => {
        let { activeConversationId } = get();
        const exists =
          activeConversationId &&
          get().conversations.some((c) => c.id === activeConversationId);

        if (!exists) {
          const conv = makeConversation(walletAddress);
          activeConversationId = conv.id;
          set((state) => ({
            conversations: [conv, ...state.conversations],
            activeConversationId: conv.id,
          }));
        }

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  title:
                    c.title ??
                    (message.role === "user"
                      ? message.content.slice(0, 64)
                      : c.title),
                  messages: [...c.messages, message],
                }
              : c,
          ),
        }));

        return activeConversationId;
      },

      updateMessage: (conversationId, messageId, patch) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
                      : m,
                  ),
                }
              : c,
          ),
        })),

      // Drops the most recent assistant message from a conversation so
      // "Regenerate" can re-append a fresh one in its place, rather than
      // stacking duplicate responses.
      removeLastAssistantMessage: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const lastIndex = c.messages.length - 1;
            if (lastIndex < 0 || c.messages[lastIndex].role !== "assistant") return c;
            return { ...c, messages: c.messages.slice(0, lastIndex) };
          }),
        })),
    }),
    {
      name: "flaregpt_chat",
      // The in-flight "streaming" flag on a message is a client-only
      // animation state, not something worth resuming mid-fake-stream on
      // a reload — messages persist as their final content, but active
      // streaming/thinking status doesn't.
      partialize: (state) => ({
        ...state,
        conversations: state.conversations.map((c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.status === "streaming" || m.status === "thinking"
              ? { ...m, status: "complete" }
              : m,
          ),
        })),
      }),
    },
  ),
);

export { makeId };
