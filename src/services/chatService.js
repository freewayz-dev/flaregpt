import { flareApi } from "@/services/apiClient";

// The backend keeps exactly one continuous history per account (no
// conversation/thread concept, no per-message id) — confirmed live: a sent
// message and its reply both show up in the very next history fetch with no
// client-side bookkeeping, and the delete endpoint takes no id/params at
// all and wipes everything. `history` here is the prior turns of the
// conversation (as {role, content} pairs) given as context for this new
// `message`; the backend persists both sides of the exchange itself.
export async function sendChatMessage(message, history, signal) {
  const { data } = await flareApi.post(
    "/api/v1/chat",
    { message, history },
    { signal },
  );
  return data;
}

// Response shape: { history: [{ role, content, timestamp }, ...] }.
export async function fetchChatHistory() {
  const { data } = await flareApi.get("/api/v1/chat/history");
  return data;
}

// No id/params — this clears the account's entire chat history, not a
// single conversation (there's no such thing server-side to target).
export async function clearChatHistory() {
  const { data } = await flareApi.delete("/api/v1/chat/history");
  return data;
}
