import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import InstallAppBanner from "@/components/common/InstallAppBanner";
import { usePwaInstallStore } from "@/store/usePwaInstallStore";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";
import * as platform from "@/utils/platform";

function fakePromptEvent(): BeforeInstallPromptEvent {
  return {
    platforms: ["web"],
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
  } as unknown as BeforeInstallPromptEvent;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("InstallAppBanner", () => {
  it("renders nothing when there's no captured install prompt and the device isn't iOS", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
  });

  it("renders nothing when already installed, even with a capturable prompt", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    usePwaInstallStore.getState().setInstalled(true);
    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
  });

  it("does not appear immediately — only after the soft delay", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    renderWithProviders(<InstallAppBanner />);

    expect(screen.queryByText("Install")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Install")).toBeInTheDocument();
  });

  it("shows an Install button on Android/desktop and calls promptInstall on click", async () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    const event = fakePromptEvent();
    usePwaInstallStore.getState().setDeferredPrompt(event);
    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const installButton = screen.getByText("Install");
    await act(async () => {
      fireEvent.click(installButton);
      // promptInstall's own await chain resolves over real microtasks
      // (a real Promise, not something fake timers control) — flushing
      // it here inside `act` is what settles the resulting state update
      // before the assertion below runs.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it("shows iOS instructions with no Install button when there's no capturable prompt", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(true);
    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText('Tap Share, then "Add to Home Screen" for quick access.')).toBeInTheDocument();
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
  });

  it("dismissing hides the banner and snoozes it rather than hiding it permanently", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const dismissButton = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissButton);

    expect(screen.queryByText("Install")).not.toBeInTheDocument();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).not.toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("stays hidden across visits within the snooze window, then reappears on the third subsequent visit", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    usePwaInstallStore.getState().dismissInstallBanner();

    const { unmount: unmount1 } = renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
    unmount1();

    const { unmount: unmount2 } = renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
    unmount2();

    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Install")).toBeInTheDocument();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("reappears after the snooze duration elapses, even on the very next visit", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    usePwaInstallStore.getState().dismissInstallBanner();

    act(() => {
      vi.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);
    });

    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Install")).toBeInTheDocument();
  });

  it("never shows once installed, even mid-snooze", () => {
    vi.spyOn(platform, "isIOSDevice").mockReturnValue(false);
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent());
    usePwaInstallStore.getState().dismissInstallBanner();
    usePwaInstallStore.getState().setInstalled(true);

    renderWithProviders(<InstallAppBanner />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText("Install")).not.toBeInTheDocument();
  });
});
