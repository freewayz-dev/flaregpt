import { ws } from "msw";
import type { WebSocketClientConnectionProtocol } from "@mswjs/interceptors/WebSocket";

import { server } from "@/test/mocks/server";
import type { ChatStreamFrame, ChatSocketOpenMessage } from "@/services/chatSocket";

interface AwaitedChatConnection {
  client: WebSocketClientConnectionProtocol;
  body: ChatSocketOpenMessage;
}

// Matches chatSocket.js's real URL construction exactly:
// `wss://api.flaregpt.io/ws/chat/{address}` (a path param, not a query
// param — the `?token=` that follows is separate and irrelevant to
// matching here).
export const chatLink = ws.link("wss://api.flaregpt.io/ws/chat/:address");

// `chatLink.addEventListener("connection", listener)` creates a brand-new
// WebSocketHandler on every call (confirmed by reading MSW's own source,
// not assumed from the types) — it has to be registered via `server.use`
// exactly like an HTTP override, which means it's already covered by the
// existing `afterEach(() => server.resetHandlers())` in setup.js. No
// separate cleanup mechanism needed here.
//
// Resolves once the client's opening message arrives, handing back the
// live `client` for the test to drive the rest of the exchange itself —
// deliberately not a fixed, send-this-sequence-automatically script. A
// script can't represent stopping *before* done/error ever arrives, which
// is exactly the cancellation behavior this phase exists to protect.
export function awaitChatConnection(): Promise<AwaitedChatConnection> {
  return new Promise((resolve) => {
    server.use(
      chatLink.addEventListener("connection", ({ client }) => {
        client.addEventListener(
          "message",
          (event) => resolve({ client, body: JSON.parse(String(event.data)) }),
          { once: true },
        );
      }),
    );
  });
}

// Named constructors for the four real frame shapes chatSocket.ts parses
// (see its `message` event handler) — tests read as "send a token frame"
// instead of hand-building JSON.stringify'd objects inline every time.
export const chatFrame = {
  status: (content: string) => JSON.stringify({ type: "status", content } satisfies ChatStreamFrame),
  token: (content: string) => JSON.stringify({ type: "token", content } satisfies ChatStreamFrame),
  done: (conversationId: string | null = null) =>
    JSON.stringify({ type: "done", conversation_id: conversationId } satisfies ChatStreamFrame),
  error: (content: string) => JSON.stringify({ type: "error", content } satisfies ChatStreamFrame),
};
