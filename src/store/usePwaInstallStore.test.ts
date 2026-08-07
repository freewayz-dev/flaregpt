import { describe, it, expect, vi } from "vitest";

import { usePwaInstallStore } from "@/store/usePwaInstallStore";

function fakePromptEvent(outcome: "accepted" | "dismissed"): BeforeInstallPromptEvent {
  return {
    platforms: ["web"],
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  } as unknown as BeforeInstallPromptEvent;
}

describe("usePwaInstallStore", () => {
  it("promptInstall returns 'unavailable' with no captured event, and calls nothing", async () => {
    const result = await usePwaInstallStore.getState().promptInstall();
    expect(result).toBe("unavailable");
  });

  it("promptInstall calls .prompt(), awaits userChoice, and clears the event on acceptance", async () => {
    const event = fakePromptEvent("accepted");
    usePwaInstallStore.getState().setDeferredPrompt(event);

    const result = await usePwaInstallStore.getState().promptInstall();

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result).toBe("accepted");
    expect(usePwaInstallStore.getState().deferredPrompt).toBeNull();
    expect(usePwaInstallStore.getState().isInstalled).toBe(true);
  });

  it("clears the spent event on dismissal too, without marking installed", async () => {
    const event = fakePromptEvent("dismissed");
    usePwaInstallStore.getState().setDeferredPrompt(event);

    const result = await usePwaInstallStore.getState().promptInstall();

    expect(result).toBe("dismissed");
    expect(usePwaInstallStore.getState().deferredPrompt).toBeNull();
    expect(usePwaInstallStore.getState().isInstalled).toBe(false);
  });

  it("setInstalled(true) also clears any captured deferred prompt — nothing left to install", () => {
    usePwaInstallStore.getState().setDeferredPrompt(fakePromptEvent("accepted"));
    usePwaInstallStore.getState().setInstalled(true);
    expect(usePwaInstallStore.getState().deferredPrompt).toBeNull();
  });

  it("dismissInstallBanner records the dismissal time and resets the visit count", () => {
    expect(usePwaInstallStore.getState().installBannerDismissedAt).toBeNull();
    usePwaInstallStore.getState().dismissInstallBanner();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).not.toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("registerInstallBannerVisit is a no-op when the banner was never dismissed", () => {
    usePwaInstallStore.getState().registerInstallBannerVisit();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("stays snoozed for the first two visits after a dismissal", () => {
    usePwaInstallStore.getState().dismissInstallBanner();

    usePwaInstallStore.getState().registerInstallBannerVisit();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).not.toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(1);

    usePwaInstallStore.getState().registerInstallBannerVisit();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).not.toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(2);
  });

  it("clears the snooze entirely on the third visit after a dismissal", () => {
    usePwaInstallStore.getState().dismissInstallBanner();

    usePwaInstallStore.getState().registerInstallBannerVisit();
    usePwaInstallStore.getState().registerInstallBannerVisit();
    usePwaInstallStore.getState().registerInstallBannerVisit();

    expect(usePwaInstallStore.getState().installBannerDismissedAt).toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("clears the snooze once three days have elapsed, even with only one visit", () => {
    vi.useFakeTimers();
    try {
      usePwaInstallStore.getState().dismissInstallBanner();

      vi.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);
      usePwaInstallStore.getState().registerInstallBannerVisit();

      expect(usePwaInstallStore.getState().installBannerDismissedAt).toBeNull();
      expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a fresh dismissal after a cleared snooze starts a new snooze cycle", () => {
    usePwaInstallStore.getState().dismissInstallBanner();
    usePwaInstallStore.getState().registerInstallBannerVisit();
    usePwaInstallStore.getState().registerInstallBannerVisit();
    usePwaInstallStore.getState().registerInstallBannerVisit();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).toBeNull();

    usePwaInstallStore.getState().dismissInstallBanner();
    expect(usePwaInstallStore.getState().installBannerDismissedAt).not.toBeNull();
    expect(usePwaInstallStore.getState().installBannerVisitsSinceDismiss).toBe(0);
  });

  it("setInstalled(true) doesn't clear an active snooze, but the banner stays permanently gated off by isInstalled regardless", () => {
    usePwaInstallStore.getState().dismissInstallBanner();
    usePwaInstallStore.getState().setInstalled(true);
    expect(usePwaInstallStore.getState().isInstalled).toBe(true);
  });
});
