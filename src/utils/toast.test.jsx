import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { toast } from "@/utils/toast";
import { useNotificationStore } from "@/store/useNotificationStore";
import NotificationCenter from "@/components/common/NotificationCenter";

// NotificationCenter needs no app-level providers (no query/wagmi/router
// context) — it only reads useNotificationStore — so plain RTL render()
// is enough here, no renderWithProviders needed.
//
// Every direct `toast.x(...)` call below is wrapped in `act()` — unlike
// `fireEvent.click(...)`, a plain function call isn't already act-wrapped,
// so without this the resulting store update (and NotificationCenter's
// re-render) isn't guaranteed to have flushed before the very next
// assertion runs.
//
// A dismissed pill's DOM node stays mounted through AnimatePresence's own
// exit animation (real, correct behavior — see NotificationCenter.jsx),
// so asserting "gone" against the DOM would be racing that animation's
// timing rather than testing this file's own logic. Checking the store's
// notifications array directly instead tests exactly what this module is
// actually responsible for.
function currentIds() {
  return useNotificationStore.getState().notifications.map((n) => n.id);
}

afterEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

describe("toast", () => {
  it("renders success/error content and applies the right tone", () => {
    render(<NotificationCenter />);
    act(() => {
      toast.success("Address copied");
      toast.error("Couldn't copy address");
    });

    expect(screen.getByText("Address copied")).toBeInTheDocument();
    expect(screen.getByText("Couldn't copy address")).toBeInTheDocument();
    // Success is role="status", error is role="alert" — same distinction
    // TransactionResultCard's own StatusBadge usage already draws between
    // real outcomes.
    expect(screen.getByText("Address copied").closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText("Couldn't copy address").closest('[role="alert"]')).toBeInTheDocument();
  });

  it("dedupes by toastId instead of stacking a second pill", () => {
    render(<NotificationCenter />);
    act(() => {
      toast.error("first message", { toastId: "session-expired" });
      toast.error("second message", { toastId: "session-expired" });
    });

    expect(screen.queryByText("first message")).not.toBeInTheDocument();
    expect(screen.getByText("second message")).toBeInTheDocument();
  });

  it("auto-dismisses after the given duration, and never for autoClose: false", () => {
    vi.useFakeTimers();
    try {
      render(<NotificationCenter />);
      act(() => {
        toast.success("quick one", { autoClose: 100 });
        toast(<span>persistent one</span>, { autoClose: false, toastId: "persistent" });
      });

      expect(screen.getByText("quick one")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(currentIds()).toEqual(["persistent"]);
      expect(screen.getByText("persistent one")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(currentIds()).toEqual(["persistent"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports dismiss(id) and update(id, { render })", () => {
    render(<NotificationCenter />);
    let id;
    act(() => {
      id = toast(<span>updating…</span>, { autoClose: false });
    });
    expect(screen.getByText("updating…")).toBeInTheDocument();

    act(() => {
      toast.update(id, { render: <span>done</span> });
    });
    expect(screen.queryByText("updating…")).not.toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();

    act(() => {
      toast.dismiss(id);
    });
    expect(currentIds()).toEqual([]);
  });

  it("calls onClick and closes on click unless closeOnClick is false", () => {
    render(<NotificationCenter />);
    const onClick = vi.fn();
    act(() => {
      toast.success("clickable", { onClick });
      toast(<span>sticky</span>, { closeOnClick: false, autoClose: false });
    });

    fireEvent.click(screen.getByText("clickable"));
    expect(onClick).toHaveBeenCalledTimes(1);
    // "clickable" is dismissed (closeOnClick default true); "sticky"
    // (closeOnClick: false) is the only one left in the store.
    expect(useNotificationStore.getState().notifications).toHaveLength(1);

    fireEvent.click(screen.getByText("sticky"));
    expect(screen.getByText("sticky")).toBeInTheDocument();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});
