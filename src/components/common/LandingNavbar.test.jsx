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

  // The actual root cause behind a separate real report: "scrolling up
  // reveals the nav only partially, over and over, until reaching the very
  // top." Real touch/momentum scrolling isn't monotonic frame-to-frame —
  // individual frames can briefly move the "wrong" way (deceleration
  // noise, sub-pixel rounding) even during an unambiguous overall gesture.
  // A naive per-frame delta reacts to every one of those, repeatedly
  // re-triggering the hide transform mid-reveal and restarting its CSS
  // transition before it can finish — it only ever completed once the
  // gesture physically had to stop, at the top of the page. This
  // simulates exactly that: a scroll-up gesture with several small
  // downward blips mixed in, none individually reversing the overall
  // trend, none of which should re-trigger the hide transform.
  it("keeps revealing the nav through a jittery-but-overall-upward scroll gesture, without flipping back to hidden mid-reveal", () => {
    const raf = stubControllableRaf();
    renderWithProviders(<LandingNavbar />);

    // Get it into the hidden state first, comfortably past the threshold.
    setScrollY(1200);
    window.dispatchEvent(new Event("scroll"));
    raf.flush();
    expect(getNav().style.transform).toBe("translateY(-120%)");

    // A jittery upward gesture, net trending up but with several
    // individual steps moving slightly back down from the previous one —
    // all still within the hysteresis band around the 1200 commit point
    // (1200 - 32 = 1168), so none of them should flip anything yet.
    const jitterPositions = [1195, 1198, 1188, 1192, 1178, 1182, 1172, 1176, 1170];
    for (const y of jitterPositions) {
      setScrollY(y);
      window.dispatchEvent(new Event("scroll"));
      raf.flush();
      expect(getNav().style.transform).toBe("translateY(-120%)");
    }

    // Finally past the threshold (1200 - 1080 = 120 > 32) — reveals in one
    // clean commit, not something the user had to keep scrolling through
    // repeated partial reveals to reach.
    setScrollY(1080);
    window.dispatchEvent(new Event("scroll"));
    raf.flush();
    expect(getNav().style.transform).toBe("translateY(0)");
  });
});
