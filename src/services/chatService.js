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

// Confirmed live: still works post-migration, and clears every
// conversation at once (not just a legacy flat view) — this is what
// Settings > Data & Storage's "delete all chat data" uses instead of
// looping a DELETE per conversation.
export async function clearAllConversations() {
  const { data } = await flareApi.delete("/api/v1/chat/history");
  return data; // { status: "cleared" }
}
