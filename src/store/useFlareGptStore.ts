import type { Address } from "viem";
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
export interface TextBlock {
  type: "text";
  markdown: string;
}

export type MessageStatus = "thinking" | "streaming" | "complete";

export interface UserChatMessage {
  id: string;
  role: "user";
  status: "complete";
  createdAt: number;
  content: string;
}

export interface AssistantChatMessage {
  id: string;
  role: "assistant";
  status: MessageStatus;
  statusText?: string | null;
  createdAt: number;
  blocks: TextBlock[];
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;

// `updateMessage` is only ever called against the one assistant bubble a
// given requestReply call itself just appended (see
// useFlareGptConversation.js) — never a user message — so the patch is
// typed against AssistantChatMessage specifically rather than the wider
// ChatMessage union.
type AssistantMessagePatch =
  | Partial<AssistantChatMessage>
  | ((message: ChatMessage) => Partial<AssistantChatMessage>);

type FlareGptWalletMode = "primary" | "specific";

interface FlareGptState {
  messages: ChatMessage[];

  // null = a guest's single ephemeral thread, or an authenticated
  // "New Chat" that hasn't had its first message sent yet (nothing is
  // created server-side until then — see requestReply in
  // useFlareGptConversation.js, which is what actually calls
  // createConversation).
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Guards the messages fetch for whichever conversation is active
  // (see useFlareGptConversation.js) so the page and the drawer —
  // both mountable at once, both calling the same hook — never fetch
  // it twice. Read/written via getState(), never as a hook
  // dependency, same reasoning as useAuthStore's isAuthenticating
  // guard. Reset (via resetMessagesLoadState) whenever the active
  // conversation actually changes, so switching threads re-fetches
  // rather than reusing the previous thread's already-loaded flag.
  isMessagesLoaded: boolean;
  isLoadingMessages: boolean;
  beginLoadingMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  resetMessagesLoadState: () => void;

  // Deliberately shaped to match `settings.flareGpt.{walletMode,
  // walletAddress}` on the Profile endpoint the backend has already
  // specced but not shipped yet — once it exists, this becomes "seed
  // from GET /profile, write via PATCH /profile" instead of
  // localStorage, with no change to the field shapes or to any
  // consumer of them (useFlareGptWalletContext.js, WalletContextPill.jsx).
  // Same defaults as that endpoint's own documented example
  // (`{walletMode: "primary", walletAddress: null}`).
  //
  // This replaced an earlier single `aiWalletAddress` field that
  // stored a literal address for *both* "primary" and "specific" —
  // which had a real bug: picking Primary while wallet A was connected
  // stored A's address, and reconnecting later as wallet B left it
  // still pointing at A instead of following the new primary. Storing
  // "primary" as its own mode (with no address at all) is what the
  // Profile endpoint's shape gets right and what this now matches —
  // "primary" always means "whichever wallet is actually connected",
  // not a frozen address. Global to the account, not scoped per
  // conversation — the backend's conversation model has no wallet
  // field, so there's nothing server-side to hang a per-thread value
  // off of, and the eventual Profile endpoint stores this as one
  // account-wide setting, not per-conversation either.
  flareGptWalletMode: FlareGptWalletMode;
  flareGptWalletAddress: Address | null;
  setFlareGptWalletContext: (mode: FlareGptWalletMode, address?: Address | null) => void;

  // Local-only preference — the backend's conversation model has no
  // "pinned" field, so this never round-trips anywhere. Reordering by
  // pin happens purely client-side wherever the conversation list is
  // rendered (see ConversationHistoryPanel.jsx).
  pinnedConversationIds: string[];
  togglePinnedConversation: (id: string) => boolean;
  // Called when a pinned conversation is deleted — an id with nothing
  // left to reference has nothing meaningful to keep pinned.
  unpinConversation: (id: string) => void;

  appendMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, patch: AssistantMessagePatch) => void;

  // Drops the most recent assistant message so "Regenerate" (or a
  // cancelled send with nothing back yet) can re-append a fresh one in
  // its place, rather than stacking duplicates or leaving an empty
  // bubble behind.
  removeLastAssistantMessage: () => void;

  clearMessages: () => void;
}

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
export const useFlareGptStore = create<FlareGptState>()(
  persist(
    (set, get): FlareGptState => ({
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
      partialize: (state: FlareGptState) => {
        const hasSession = Boolean(useAuthStore.getState().token);
        return {
          messages: hasSession
            ? state.messages.map((m) =>
                m.role === "assistant" && (m.status === "streaming" || m.status === "thinking")
                  ? { ...m, status: "complete" as const }
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

export { makeId, PIN_LIMIT };
