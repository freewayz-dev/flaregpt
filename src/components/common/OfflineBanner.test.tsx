import { describe, it, expect, afterEach } from "vitest";

import OfflineBanner from "@/components/common/OfflineBanner";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("OfflineBanner", () => {
  const originalOnLine = window.navigator.onLine;

  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("shows the extended message — cached data stays visible, actions are paused", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    renderWithProviders(<OfflineBanner />);

    expect(
      screen.getByText("You're offline. Cached data is still shown, but actions that need a connection are paused."),
    ).toBeInTheDocument();
  });

  it("renders nothing while online and no reconnect just happened", () => {
    renderWithProviders(<OfflineBanner />);
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
    expect(screen.queryByText("Back online")).not.toBeInTheDocument();
  });
});
