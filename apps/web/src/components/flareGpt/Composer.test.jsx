import { describe, it, expect, vi, afterEach } from "vitest";

import Composer from "@/components/flareGpt/Composer";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";

function renderComposer(onSend = vi.fn()) {
  renderWithProviders(
    <Composer
      onSend={onSend}
      isGenerating={false}
      onStop={vi.fn()}
      onOpenWalletModal={vi.fn()}
      focusRequestId={0}
    />,
  );
  return { onSend };
}

describe("Composer — offline", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("blocks sending while offline but leaves the draft typable", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    const { onSend } = renderComposer();

    const textarea = screen.getByPlaceholderText("You're offline, so messages can't be sent right now");
    expect(textarea).not.toBeDisabled();
    fireEvent.change(textarea, { target: { value: "Still here?" } });
    expect(textarea).toHaveValue("Still here?");

    const sendButton = screen.getByTitle("You're offline, so messages can't be sent right now");
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends normally once back online", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    const { onSend } = renderComposer();

    fireEvent.change(screen.getByPlaceholderText("You're offline, so messages can't be sent right now"), {
      target: { value: "Hello" },
    });

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    fireEvent(window, new Event("online"));

    const sendButton = screen.getByTitle("Send");
    expect(sendButton).toBeEnabled();
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledWith("Hello");
  });
});
