import type { Address } from "viem";

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

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

// The client's own opening frame, sent the instant the socket connects
// (see the "open" listener below) — named and exported so the test mock
// (src/test/mocks/chatSocket.ts) can assert against its real shape too.
export interface ChatSocketOpenMessage {
  message: string;
  conversation_id?: string;
  history?: ChatHistoryEntry[];
}

// The four real frame shapes the server ever pushes over this socket (see
// chatFrame in src/test/mocks/chatSocket.js, which mirrors this exactly for
// tests). `unknown` at JSON.parse's own boundary, narrowed through
// isChatStreamFrame below, rather than trusting the parsed value's shape by
// assertion — a genuinely external, adversarial-by-construction boundary
// (this is *some* string over the wire, not necessarily this).
export type ChatStreamFrame =
  | { type: "status"; content: string }
  | { type: "token"; content: string }
  | { type: "done"; conversation_id: string | null }
  | { type: "error"; content: string };

function isChatStreamFrame(value: unknown): value is ChatStreamFrame {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  const { type } = value as { type: unknown };
  return type === "status" || type === "token" || type === "done" || type === "error";
}

interface StreamChatMessageOptions {
  address?: Address;
  conversationId?: string;
  history?: ChatHistoryEntry[];
  onStatus?: (content: string) => void;
  onToken?: (content: string) => void;
  onDone?: (result: { conversationId: string | null }) => void;
  onError?: (error: ChatStreamError) => void;
}

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
  message: string,
  {
    address,
    conversationId,
    history,
    onStatus,
    onToken,
    onDone,
    onError,
  }: StreamChatMessageOptions = {},
): { cancel: () => void } {
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

  // Generic rather than typed against one specific callback: this same
  // helper settles either onDone (arg: {conversationId}) or onError
  // (arg: ChatStreamError) below, and a generic here is what lets each call
  // site's own argument type flow straight through with no cast — the
  // alternative is either duplicating this three-line guard per callback or
  // asserting the mismatch away, and the latter is exactly the kind of
  // unsafe assertion this migration is meant to avoid introducing.
  function settle<T>(fn: ((arg: T) => void) | undefined, arg: T): void {
    if (settled) return;
    settled = true;
    fn?.(arg);
  }

  ws.addEventListener("open", () => {
    const body: ChatSocketOpenMessage = {
      message,
    };
    if (conversationId) body.conversation_id = conversationId;
    else if (history) body.history = history;
    ws.send(JSON.stringify(body));
  });

  ws.addEventListener("message", (event) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!isChatStreamFrame(parsed)) return;

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
  ws.addEventListener("close", () =>
    settle(onError, new ChatStreamError("Chat connection closed unexpectedly")),
  );

  return {
    // A deliberate Stop isn't a failure to report — flagging settled first
    // means the close event this triggers won't also fire onError.
    cancel: () => {
      settled = true;
      ws.close();
    },
  };
}
