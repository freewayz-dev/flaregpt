import { describe, it, expect, vi, afterEach } from "vitest";

import {
  registerUpdatePolling,
  UPDATE_CHECK_INTERVAL_MS,
  MIN_MS_BETWEEN_UPDATE_CHECKS,
} from "@/utils/updatePolling";

function createMockRegistration() {
  return { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration;
}

describe("registerUpdatePolling", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not call update() immediately on registration", () => {
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    expect(registration.update).not.toHaveBeenCalled();
    dispose();
  });

  it("calls update() once the interval elapses", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);

    expect(registration.update).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("keeps calling update() on every subsequent interval tick", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 3);

    expect(registration.update).toHaveBeenCalledTimes(3);
    dispose();
  });

  it("checks immediately when the tab regains focus", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    // Advance past the debounce window so the very first focus event isn't
    // suppressed by the "just registered" starting timestamp.
    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    window.dispatchEvent(new Event("focus"));

    expect(registration.update).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("checks immediately when visibilitychange fires with the tab visible", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(registration.update).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("does not check when visibilitychange fires while the tab is hidden", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(registration.update).not.toHaveBeenCalled();
    dispose();
  });

  // "Don't hammer the server": a burst of rapid focus/visibilitychange
  // events (fast app-switching) must not turn into a burst of update()
  // calls — this is the debounce that keeps foreground checks bounded.
  it("debounces a burst of focus events into a single check", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));

    expect(registration.update).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("a focus check after the debounce window elapses fires again", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(MIN_MS_BETWEEN_UPDATE_CHECKS + 1);
    window.dispatchEvent(new Event("focus"));

    expect(registration.update).toHaveBeenCalledTimes(2);
    dispose();
  });

  it("dispose() stops the interval and removes the event listeners", async () => {
    vi.useFakeTimers();
    const registration = createMockRegistration();
    const dispose = registerUpdatePolling(registration);

    dispose();
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS * 2);
    window.dispatchEvent(new Event("focus"));

    expect(registration.update).not.toHaveBeenCalled();
  });

  it("does not throw when registration.update() rejects (e.g. offline)", async () => {
    vi.useFakeTimers();
    const registration = {
      update: vi.fn().mockRejectedValue(new Error("network error")),
    } as unknown as ServiceWorkerRegistration;
    const dispose = registerUpdatePolling(registration);

    await expect(vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS)).resolves.not.toThrow();
    dispose();
  });
});
