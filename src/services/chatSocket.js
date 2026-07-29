import { useAuthStore } from "@/store/useAuthStore";

const WS_BASE = "wss://api.flaregpt.io/ws/chat";
// The route requires a non-empty path segment no matter what — confirmed
// live: both an omitted and an empty segment fail the handshake outright
// (close code 1006) — so there's no way to leave this out entirely for the
// one case where no real wallet exists at all (a fully anonymous guest,
// never authenticated, wallet never connected). This is that last resort
// only; every other caller reaches this function with a real address (see
// the fallback chain below), and the backend doesn't read this segment for
// anything yet regardless. Same well-known EVM null address already used
// for the same "genuinely nothing to put here" purpose in donation.js.
const NO_WALLET_SENTINEL = "0x0000000000000000000000000000000000000000";

export class ChatStreamError extends Error {}

// Streams one chat turn over the real-time endpoint that replaces the old
// POST /api/v1/chat. Confirmed live against api.flaregpt.io: instead of one
// buffered JSON body, the server pushes `status` frames (progress while it
// gathers wallet/chain data), `token` frames (the reply, word by word),
// then a terminal `done` or `error` frame — so the reply can render as
// it's generated instead of waiting for the whole thing.
//
// The `{address}` path segment is confirmed NOT read by the backend yet —
// connecting with one address and asking about a different one in
// `message` still only ever answers about whatever address appears in the
// message text (same as the old REST endpoint). Still, the caller's
// `address` (the wallet actually selected in the pill — primary or a
// specific watchlist pick) is what goes there, falling back through the
// signed-in wallet if that's somehow unset, for when the backend does
// start reading it.
//
// A WebSocket handshake can't carry a custom Authorization header the way
// axios does, so an authenticated session is passed as `?token=` instead —
// confirmed live that this is what lets `conversation_id` recall
// server-side history exactly like REST already does. Without it the
// connection is anonymous: `conversation_id` is silently ignored, and the
// caller must resend `history` on every turn for continuity, same as a
// guest on REST.
export function streamChatMessage(
  message,
  { address, conversationId, history, onStatus, onToken, onDone, onError } = {},
) {
  const { token, authenticatedAddress, connectedAddress } = useAuthStore.getState();
  const mismatchedWallet =
    authenticatedAddress &&
    connectedAddress &&
    authenticatedAddress.toLowerCase() !== connectedAddress.toLowerCase();
  const authToken = token && !mismatchedWallet ? token : null;

  // Prefer the wallet actually selected for this chat; an authenticated
  // caller always has at least `authenticatedAddress` even with their
  // wallet disconnected (auth is deliberately decoupled from connection —
  // see apiClient.js), so that's a real runtime value too, not a guess.
  // Only a fully anonymous guest — never signed in, nothing ever connected
  // — falls all the way through to the sentinel.
  const pathAddress = address || authenticatedAddress || connectedAddress || NO_WALLET_SENTINEL;
  const url = new URL(`${WS_BASE}/${pathAddress}`);
  if (authToken) url.searchParams.set("token", authToken);

  const ws = new WebSocket(url.toString());
  let settled = false;

  const settle = (fn, arg) => {
    if (settled) return;
    settled = true;
    fn?.(arg);
  };

  ws.addEventListener("open", () => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;
    else if (history) body.history = history;
    ws.send(JSON.stringify(body));
  });

  ws.addEventListener("message", (event) => {
    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    if (parsed.type === "status") {
      onStatus?.(parsed.content);
    } else if (parsed.type === "token") {
      onToken?.(parsed.content);
    } else if (parsed.type === "done") {
      settle(onDone, { conversationId: parsed.conversation_id ?? null });
      ws.close();
    } else if (parsed.type === "error") {
      settle(onError, new ChatStreamError(parsed.content || "Chat stream error"));
      ws.close();
    }
  });

  ws.addEventListener("error", () => settle(onError, new ChatStreamError("Chat connection error")));
  ws.addEventListener("close", () => settle(onError, new ChatStreamError("Chat connection closed unexpectedly")));

  return {
    // A deliberate Stop isn't a failure to report — flagging settled first
    // means the close event this triggers won't also fire onError.
    cancel: () => {
      settled = true;
      ws.close();
    },
  };
}
