import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import FlareWidget from "@/components/common/FlareWidget";
import { useAuthStore } from "@/store/useAuthStore";
import { MOCK_AUTH_TOKEN } from "@/test/mocks/handlers";
import { renderWithProviders, screen, fireEvent, waitFor } from "@/test/test-utils";

function signIn() {
  useAuthStore.getState().setSession(MOCK_AUTH_TOKEN, "0x1111111111111111111111111111111111111111");
}

describe("FlareWidget — New Chat closes the history panel", () => {
  beforeEach(() => {
    signIn();
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("closes an open history list when New Chat is clicked from the toolbar", async () => {
    renderWithProviders(<FlareWidget open onClose={vi.fn()} onOpenWalletModal={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText("History"));
    await screen.findByText("Existing conversation");
    expect(screen.getByRole("dialog", { name: "Chat History" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("New Chat"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Chat History" })).not.toBeInTheDocument();
    });
  });

  it("resets to a blank conversation, not just closing the panel", async () => {
    renderWithProviders(<FlareWidget open onClose={vi.fn()} onOpenWalletModal={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText("History"));
    await screen.findByText("Existing conversation");
    fireEvent.click(screen.getByText("Existing conversation"));
    await waitFor(() => expect(screen.queryByText("Existing conversation")).not.toBeInTheDocument());

    fireEvent.click(await screen.findByLabelText("History"));
    await screen.findByText("Existing conversation");

    fireEvent.click(screen.getByLabelText("New Chat"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Chat History" })).not.toBeInTheDocument();
    });
  });
});
