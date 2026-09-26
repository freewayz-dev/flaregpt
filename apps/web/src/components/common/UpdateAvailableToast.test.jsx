import { describe, it, expect, vi } from "vitest";

import { promptForUpdate } from "@/components/common/UpdateAvailableToast";
import { useFlareGptStore } from "@/store/useFlareGptStore";
import { renderWithProviders, screen, fireEvent, waitFor } from "@/test/test-utils";


// promptForUpdate is a plain function driven by registerSW's own
// onNeedRefresh callback, not a component — it needs a mounted
// ToastContainer to actually render into (see test-utils.tsx's own
// comment on why a real one is used), but nothing else from the tree.
function renderToastHost() {
  return renderWithProviders(<></>);
}

function streamingAssistantMessage() {
  return {
    id: "msg-1",
    role: "assistant",
    status: "streaming",
    createdAt: Date.now(),
    blocks: [{ type: "text", markdown: "partial reply" }],
  };
}

describe("promptForUpdate — chat-safe update activation", () => {
  it("applies the update immediately when no chat response is in flight", async () => {
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    fireEvent.click(await screen.findByText("Reload"));

    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("defers activation while an assistant reply is streaming, then applies once it completes", async () => {
    useFlareGptStore.getState().appendMessage(streamingAssistantMessage());
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    fireEvent.click(await screen.findByText("Reload"));

    // Real assertion, not a timing guess: give the event loop every chance
    // to call applyUpdate before checking it never did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(applyUpdate).not.toHaveBeenCalled();
    await screen.findByText("Update will apply as soon as your current response finishes.");

    useFlareGptStore.getState().updateMessage("msg-1", { status: "complete" });

    await waitFor(() => expect(applyUpdate).toHaveBeenCalledTimes(1));
  });

  it("does not apply the update at all if the reply finishes without the user ever clicking Reload", async () => {
    useFlareGptStore.getState().appendMessage(streamingAssistantMessage());
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    await screen.findByText("A new version of FlareGPT is available.");

    useFlareGptStore.getState().updateMessage("msg-1", { status: "complete" });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});

describe("promptForUpdate — not dismissible", () => {
  it("renders with no close button, whether just shown or waiting on a deferred reply", async () => {
    useFlareGptStore.getState().appendMessage(streamingAssistantMessage());
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    await screen.findByText("A new version of FlareGPT is available.");
    expect(screen.queryByLabelText("close")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Reload"));
    await screen.findByText("Update will apply as soon as your current response finishes.");
    expect(screen.queryByLabelText("close")).not.toBeInTheDocument();
  });

  it("stays on screen when clicked or after autoClose would normally have fired", async () => {
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    const toastEl = await screen.findByText("A new version of FlareGPT is available.");

    fireEvent.click(toastEl);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByText("A new version of FlareGPT is available.")).toBeInTheDocument();
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});
