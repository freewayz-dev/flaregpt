import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { useConversations } from "@/hooks/queries/useChatQueries";
import { useAuthStore } from "@/store/useAuthStore";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

const { primary: WALLET_A, watchlist: WALLET_B } = TEST_ADDRESSES;

function ConversationsProbe() {
  const { data } = useConversations(true);
  return <p>conversations: {(data ?? []).map((c) => c.id).join(",") || "(empty)"}</p>;
}

// Same bug class, same fix, as useWatchlistQueries.test.tsx's identity-
// scoping test — see that file's comment for the full root-cause writeup.
// Chat conversations used the identical unscoped-key pattern
// (queryKeys.chat.conversations()), so a fast wallet switch could just as
// easily have shown Wallet A's conversation list under Wallet B's session.
describe("useConversations — identity-scoped cache", () => {
  it("shows Wallet B's own conversations immediately after switching from Wallet A, even within Wallet A's staleTime window", async () => {
    server.use(
      http.get(`${API}/api/v1/chat/conversations`, ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (auth?.includes("wallet-a-token")) {
          return HttpResponse.json({ conversations: [] });
        }
        if (auth?.includes("wallet-b-token")) {
          return HttpResponse.json({
            conversations: [
              { id: "convo-b-1", title: "B's chat", created_at: 0, updated_at: 0, message_count: 1 },
            ],
          });
        }
        return HttpResponse.json({ conversations: [] });
      }),
    );

    useAuthStore.setState({ token: "wallet-a-token", authenticatedAddress: WALLET_A });
    const { rerender } = renderWithProviders(<ConversationsProbe />);

    await waitFor(() => {
      expect(screen.getByText("conversations: (empty)")).toBeInTheDocument();
    });

    useAuthStore.setState({ token: null, authenticatedAddress: null });
    useAuthStore.setState({ token: "wallet-b-token", authenticatedAddress: WALLET_B });
    rerender(<ConversationsProbe />);

    await waitFor(() => {
      expect(screen.getByText("conversations: convo-b-1")).toBeInTheDocument();
    });
    expect(screen.queryByText("conversations: (empty)")).not.toBeInTheDocument();
  });
});
