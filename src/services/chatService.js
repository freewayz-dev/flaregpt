import { flareApi } from "@/services/apiClient";

// Response: { conversations: [{ id, title, created_at, updated_at,
// message_count }, ...] } — metadata only, no messages (see
// fetchConversation for the full thread).
export async function fetchConversations() {
  const { data } = await flareApi.get("/api/v1/chat/conversations");
  return data.conversations ?? [];
}

// A null/omitted title is not a client-side placeholder — the backend
// itself names it "New Chat" (confirmed live), so a caller that doesn't
// have a better title yet (see useFlareGptConversation.js, which derives
// one from the first message instead of relying on this) can just pass
// nothing rather than duplicating that default string here.
export async function createConversation(title) {
  const { data } = await flareApi.post("/api/v1/chat/conversations", {
    title: title || null,
  });
  return data; // { id, title, created_at, updated_at, message_count }
}

// Response: { id, title, created_at, updated_at, messages: [{role,
// content, timestamp}, ...] } — the one call that returns the actual
// transcript. A conversation_id that no longer exists (deleted elsewhere,
// another device/tab) responds 404.
export async function fetchConversation(conversationId) {
  const { data } = await flareApi.get(`/api/v1/chat/conversations/${conversationId}`);
  return data;
}

export async function renameConversation(conversationId, title) {
  const { data } = await flareApi.patch(`/api/v1/chat/conversations/${conversationId}`, {
    title,
  });
  return data; // { status: "renamed", id, title }
}

// A conversation_id that's already gone responds 404 — callers treat that
// as success (the end state they wanted is already true), same reasoning
// as the watchlist's remove flow.
export async function deleteConversation(conversationId) {
  const { data } = await flareApi.delete(`/api/v1/chat/conversations/${conversationId}`);
  return data; // { status: "deleted", id }
}

// NOT `DELETE /api/v1/chat/history`, despite that endpoint existing and
// claiming success — confirmed live it only ever actually deletes the
// single most-recently-updated conversation no matter how many exist,
// while still responding `{"status": "cleared"}` regardless. That's worse
// than the endpoint just not existing: a caller (and the user, via the
// success toast Settings > Data & Storage shows) has no way to tell a
// real full clear apart from that silent partial one. Looping the
// single-conversation delete instead — already proven reliable, it's what
// the history panel's own row-delete uses — actually delivers "every
// conversation is gone" rather than trusting a response that doesn't
// reflect what happened server-side.
export async function clearAllConversations() {
  const conversations = await fetchConversations();
  await Promise.all(
    conversations.map((c) =>
      deleteConversation(c.id).catch((error) => {
        // Already gone (a race with another tab/device) is the outcome we
        // wanted anyway — only a genuine failure should fail the whole
        // clear, matching the same 404-is-fine convention used elsewhere
        // for this same per-conversation delete.
        if (error?.response?.status === 404) return;
        throw error;
      }),
    ),
  );
  return { status: "cleared" };
}
