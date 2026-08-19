import { describe, it, expect, vi, afterEach } from "vitest";

import LandingNavbar from "@/components/common/LandingNavbar";
import { renderWithProviders, screen } from "@/test/test-utils";

function setScrollY(value) {
  Object.defineProperty(window, "scrollY", { value, configurable: true, writable: true });
}

function getNav() {
  return screen.getByRole("navigation");
}

// Queues rAF callbacks instead of running them, so a test can control
// exactly when (or whether) a "frame" actually executes — this is what
// lets the second test below simulate a browser dropping a queued frame
// during backgrounding, the real failure mode being fixed.
function stubControllableRaf() {
  const queue = [];
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    queue.push(cb);
    return queue.length;
  });
  return {
    flush: () => {
      const callbacks = queue.splice(0);
      callbacks.forEach((cb) => cb());
    },
    pending: () => queue.length,
  };
}

describe("LandingNavbar — hide/show on scroll", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setScrollY(0);
  });

  it("hides on scroll down past the threshold, then reappears on scroll up", () => {
    const raf = stubControllableRaf();
    renderWithProviders(<LandingNavbar />);

    setScrollY(200);
    window.dispatchEvent(new Event("scroll"));
    raf.flush();
    expect(getNav().style.transform).toBe("translateY(-120%)");

    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    raf.flush();
    expect(getNav().style.transform).toBe("translateY(0)");
  });

  // The actual reported bug: on mobile/PWA, backgrounding the tab (an app
  // switch, screen lock, a notification pull-down) suspends
  // requestAnimationFrame — if a scroll event has just set the "a frame is
  // pending" guard true right as that happens, the queued frame that would
  // normally clear it can be dropped instead of merely delayed. Without a
  // recovery path, that guard stays stuck true forever, so onScroll's own
  // "only schedule a frame if one isn't already pending" check silently
  // stops scheduling *any* future frame — the nav freezes in whatever
  // state it was last in and never updates again, even once scrolling
  // resumes normally. This is exactly "stays stuck at the top instead of
  // disappearing."
  it("recovers once the page becomes visible again, even if a queued frame was dropped mid-scroll", () => {
    const raf = stubControllableRaf();
    renderWithProviders(<LandingNavbar />);

    setScrollY(200);
    window.dispatchEvent(new Event("scroll"));
    // Simulates the browser dropping this queued frame instead of running
    // it — the tab was backgrounded before it ever fired. Deliberately
    // never flushed.
    expect(raf.pending()).toBe(1);

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // A real scroll after coming back to the foreground must still be able
    // to schedule (and this time, actually run) a fresh frame — proving
    // the "pending frame" guard was reset, not left permanently wedged.
    setScrollY(400);
    window.dispatchEvent(new Event("scroll"));
    raf.flush();

    expect(getNav().style.transform).toBe("translateY(-120%)");
  });
});
