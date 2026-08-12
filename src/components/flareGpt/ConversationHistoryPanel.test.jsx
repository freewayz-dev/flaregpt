import { describe, it, expect, vi, afterEach } from "vitest";

import ConversationHistoryPanel from "@/components/flareGpt/ConversationHistoryPanel";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";


const conversation = {
  id: "conv-1",
  title: "Test conversation",
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
  message_count: 2,
};

function renderPanel(overrides = {}) {
  const onRename = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn();
  const onTogglePin = vi.fn().mockReturnValue(true);

  renderWithProviders(
    <ConversationHistoryPanel
      open
      onClose={vi.fn()}
      conversations={[conversation]}
      isLoading={false}
      isError={false}
      onRetry={vi.fn()}
      activeConversationId={null}
      pinnedIds={[]}
      onSelect={vi.fn()}
      onNewChat={vi.fn()}
      onTogglePin={onTogglePin}
      onRename={onRename}
      onDelete={onDelete}
      {...overrides}
    />,
  );
  return { onRename, onDelete, onTogglePin };
}

function openRowMenu() {
  fireEvent.click(screen.getByLabelText("More actions"));
}

describe("ConversationHistoryPanel — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("disables Rename and Delete (but not Pin) while offline, with an explanatory tooltip", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    const { onRename, onDelete, onTogglePin } = renderPanel();
    openRowMenu();

    const renameButton = screen.getByText("Rename").closest("button");
    const deleteButton = screen.getByText("Delete").closest("button");
    const pinButton = screen.getByText("Pin").closest("button");

    expect(renameButton).toBeDisabled();
    expect(renameButton).toHaveAttribute("title", "You're offline. This needs an internet connection.");
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "You're offline. This needs an internet connection.");
    expect(pinButton).not.toBeDisabled();

    fireEvent.click(renameButton);
    fireEvent.click(deleteButton);
    expect(onRename).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(pinButton);
    expect(onTogglePin).toHaveBeenCalledTimes(1);
  });

  it("re-enables Rename and Delete once back online", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    renderPanel();
    openRowMenu();
    expect(screen.getByText("Rename").closest("button")).toBeDisabled();

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    fireEvent(window, new Event("online"));

    expect(screen.getByText("Rename").closest("button")).not.toBeDisabled();
    expect(screen.getByText("Delete").closest("button")).not.toBeDisabled();
  });

  it("blocks committing a rename (e.g. via Enter) if connectivity drops mid-edit", async () => {
    const { onRename } = renderPanel();
    openRowMenu();
    fireEvent.click(screen.getByText("Rename"));

    const input = screen.getByLabelText("Conversation name");
    fireEvent.change(input, { target: { value: "New title" } });

    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    fireEvent(window, new Event("offline"));

    fireEvent.keyDown(input, { key: "Enter" });
    await Promise.resolve();

    expect(onRename).not.toHaveBeenCalled();
  });

  it("allows Rename and Delete normally while online", async () => {
    const { onRename, onDelete } = renderPanel();
    openRowMenu();

    fireEvent.click(screen.getByText("Rename"));
    expect(onRename).not.toHaveBeenCalled(); // opens the inline editor, doesn't save yet

    const input = screen.getByLabelText("Conversation name");
    fireEvent.change(input, { target: { value: "Renamed" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      // commitRename's own await chain resolves over real microtasks —
      // flushing it here inside `act` settles the resulting state update
      // (isSavingRename -> false, renamingId -> null) before this test
      // reopens the row menu below.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onRename).toHaveBeenCalledWith("conv-1", "Renamed");

    openRowMenu();
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("conv-1");
  });
});
