import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { promptForUpdate } from "@/components/common/UpdateAvailableToast";
import { useFlareGptStore } from "@/store/useFlareGptStore";
import { renderWithProviders, screen, fireEvent, waitFor, act } from "@/test/test-utils";


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

  it("closing the toast while deferred (waiting for the reply to finish) truly cancels the pending apply, rather than silently applying it later", async () => {
    useFlareGptStore.getState().appendMessage(streamingAssistantMessage());
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    promptForUpdate(applyUpdate);
    fireEvent.click(await screen.findByText("Reload"));
    await screen.findByText("Update will apply as soon as your current response finishes.");

    // The user closes the toast themselves while still in this deferred
    // state — this must read as "actually, don't," not "go ahead, just
    // silently, once the reply finishes."
    fireEvent.click(screen.getByLabelText("close"));

    useFlareGptStore.getState().updateMessage("msg-1", { status: "complete" });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(applyUpdate).not.toHaveBeenCalled();
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

describe("promptForUpdate — dismiss snoozes rather than permanently hiding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not re-show on the hour mark alone — it waits for the tab to regain focus after that", async () => {
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    act(() => {
      promptForUpdate(applyUpdate);
    });
    expect(screen.getByText("A new version of FlareGPT is available.")).toBeInTheDocument();

    const closeButton = screen.getByLabelText("close");
    act(() => {
      fireEvent.click(closeButton);
    });
    // jsdom never fires a real `animationend` on its own, and
    // react-toastify's exit removal (deleteToast, which frees up the
    // toastId for the retry's fresh toast() call below) waits for exactly
    // that event — attached by an effect that only runs once the click
    // above has been flushed — before its internal collapse/removal
    // timers even start. Dispatched by hand here, the same way a real
    // browser would once the CSS exit animation actually finished.
    document.querySelector(".Toastify__toast")?.dispatchEvent(new Event("animationend", { bubbles: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.queryByText("A new version of FlareGPT is available.")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    // The hour has passed, but nothing has happened to the tab yet — the
    // prompt must stay hidden until an actual return-to-the-tab signal.
    expect(screen.queryByText("A new version of FlareGPT is available.")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(screen.getByText("A new version of FlareGPT is available.")).toBeInTheDocument();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("ignores a focus/visibility event that happens before the hour floor has elapsed", async () => {
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    act(() => {
      promptForUpdate(applyUpdate);
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("close"));
    });
    document.querySelector(".Toastify__toast")?.dispatchEvent(new Event("animationend", { bubbles: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Well short of the one-hour floor — a normal tab-switch here should
    // not re-arm or immediately trigger the prompt.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.queryByText("A new version of FlareGPT is available.")).not.toBeInTheDocument();

    // Once the floor is actually reached, the very next focus does trigger it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText("A new version of FlareGPT is available.")).toBeInTheDocument();
  });

  it("a second dismissed update supersedes the first's pending retry instead of stacking alongside it", async () => {
    renderToastHost();
    const applyUpdate1 = vi.fn().mockResolvedValue(undefined);
    const applyUpdate2 = vi.fn().mockResolvedValue(undefined);

    // First update arrives and gets dismissed — schedules a retry due at
    // the one-hour floor.
    act(() => {
      promptForUpdate(applyUpdate1);
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("close"));
    });
    document.querySelector(".Toastify__toast")?.dispatchEvent(new Event("animationend", { bubbles: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Halfway to that floor, a second (newer) update arrives and also gets
    // dismissed — its own retry should entirely replace the first's, not
    // add a second timer/listener pair alongside it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    act(() => {
      promptForUpdate(applyUpdate2);
    });
    act(() => {
      fireEvent.click(screen.getByLabelText("close"));
    });
    document.querySelector(".Toastify__toast")?.dispatchEvent(new Event("animationend", { bubbles: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Reaching the *first* retry's original one-hour deadline: if it
    // weren't properly cancelled, its listeners would already be armed
    // here and this focus event would wrongly re-show the (stale) first
    // update's prompt.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.queryByText("A new version of FlareGPT is available.")).not.toBeInTheDocument();

    // Reaching the *second* retry's own (later) deadline — this is the
    // one that should actually fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText("A new version of FlareGPT is available.")).toBeInTheDocument();
    expect(applyUpdate1).not.toHaveBeenCalled();
    expect(applyUpdate2).not.toHaveBeenCalled();
  });

  it("does not schedule a retry when the toast closes because the update was applied", async () => {
    renderToastHost();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    act(() => {
      promptForUpdate(applyUpdate);
    });
    act(() => {
      fireEvent.click(screen.getByText("Reload"));
    });
    document.querySelector(".Toastify__toast")?.dispatchEvent(new Event("animationend", { bubbles: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(applyUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(screen.queryByText("A new version of FlareGPT is available.")).not.toBeInTheDocument();
  });
});
