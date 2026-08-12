import { describe, it, expect } from "vitest";

import { useFlareGptConversation } from "@/hooks/useFlareGptConversation";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";
import { awaitChatConnection, chatFrame } from "@/test/mocks/chatSocket";
import { server } from "@/test/mocks/server";
import { MOCK_AUTH_TOKEN, MOCK_CONVERSATION_ID } from "@/test/mocks/handlers";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";
import { http, HttpResponse } from "msw";

function ChatProbe() {
  const { messages, send, stop, activeConversationId } = useFlareGptConversation();
  return (
    <div>
      <button onClick={() => send("Hello")}>Send</button>
      <button onClick={() => stop()}>Stop</button>
      <p>activeConversationId: {activeConversationId ?? "(none)"}</p>
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            {m.role}:{m.status}:
            {m.role === "user" ? m.content : (m.blocks ?? []).map((b) => b.markdown).join("")}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe("useFlareGptConversation — guest streaming", () => {
  it("streams a reply token by token and reaches complete", async () => {
    const connectionPromise = awaitChatConnection();
    renderWithProviders(<ChatProbe />);

    fireEvent.click(screen.getByText("Send"));
    expect(await screen.findByText("user:complete:Hello")).toBeInTheDocument();

    const { client, body } = await connectionPromise;
    // Guests carry conversation continuity as resent history, never a
    // conversation_id — nothing is ever created server-side for them.
    expect(body.message).toBe("Hello");
    expect(body.history).toEqual([]);

    client.send(chatFrame.status("Thinking..."));
    client.send(chatFrame.token("Hi "));
    // RTL normalizes whitespace by default (collapses/trims) when matching
    // text content — matching against the trimmed form here, not because
    // the trailing space isn't really there.
    await screen.findByText("assistant:streaming:Hi");

    client.send(chatFrame.token("there!"));
    client.send(chatFrame.done());

    expect(await screen.findByText("assistant:complete:Hi there!")).toBeInTheDocument();
  });

  it("stops mid-stream and ignores a late-arriving done frame", async () => {
    const connectionPromise = awaitChatConnection();
    renderWithProviders(<ChatProbe />);
    fireEvent.click(screen.getByText("Send"));

    const { client } = await connectionPromise;
    client.send(chatFrame.status("Thinking..."));
    client.send(chatFrame.token("Partial"));
    await screen.findByText("assistant:streaming:Partial");

    fireEvent.click(screen.getByText("Stop"));
    // stop() removes the in-progress assistant bubble entirely, rather
    // than freezing it mid-stream.
    await waitFor(() => {
      expect(screen.queryByText(/^assistant:/)).not.toBeInTheDocument();
    });

    // A done frame arriving after cancel must be a no-op — chatSocket.js's
    // `settled` guard, set by cancel(), should have already made this
    // connection inert. Flushing one macrotask lets any (incorrect)
    // pending update apply before asserting nothing changed.
    client.send(chatFrame.done("late-conversation-id"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/^assistant:/)).not.toBeInTheDocument();
  });
});

describe("useFlareGptConversation — authenticated first send", () => {
  it("lazily creates a conversation before the socket's opening message, and adopts its id", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    const connectionPromise = awaitChatConnection();
    renderWithProviders(<ChatProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    fireEvent.click(screen.getByText("Send"));

    const { client, body } = await connectionPromise;
    // The conversation already exists by the time the socket opens — its
    // id rides along instead of resent history.
    expect(body.conversation_id).toBe(MOCK_CONVERSATION_ID);
    expect(body.history).toBeUndefined();

    client.send(chatFrame.done(MOCK_CONVERSATION_ID));
    expect(
      await screen.findByText(`activeConversationId: ${MOCK_CONVERSATION_ID}`),
    ).toBeInTheDocument();
  });

  it("rolls back the just-created conversation when the first send errors", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });
    let deletedId = undefined;
    server.use(
      http.delete(`${API}/api/v1/chat/conversations/:id`, ({ params }) => {
        deletedId = params.id;
        return HttpResponse.json({ status: "deleted", id: params.id });
      }),
    );

    const connectionPromise = awaitChatConnection();
    renderWithProviders(<ChatProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    fireEvent.click(screen.getByText("Send"));

    const { client } = await connectionPromise;
    client.send(chatFrame.error("Something went wrong upstream"));

    // The failed assistant bubble is removed, the conversation that only
    // existed because of this attempt is deleted, and the view resets to
    // "no active conversation" — nothing is left half-created.
    await waitFor(() => expect(screen.queryByText(/^assistant:/)).not.toBeInTheDocument());
    await waitFor(() => expect(deletedId).toBe(MOCK_CONVERSATION_ID));
    expect(screen.getByText("activeConversationId: (none)")).toBeInTheDocument();
  });
});
