import { describe, it, expect } from "vitest";

import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import { renderWithProviders, screen } from "@/test/test-utils";

const ITEMS = [
  { epoch: 100, amount: 12.5, claimed: true },
  { epoch: 101, amount: 8.25, claimed: false },
];

describe("GenericTable — scroll containment", () => {
  // Regression guard for the table-scroll-trapping bug, now inverted from
  // this test's own earlier version: this table has a deliberate fixed
  // height (see the component's own comment — a long table scrolls
  // internally rather than growing its card), and an earlier revision
  // deliberately *contained* its vertical overscroll on the reasoning that
  // reaching the table's own top/bottom shouldn't also rubber-band the
  // page behind it. Confirmed live that this instead trapped the gesture:
  // a mobile user scrolling this table, on hitting its own boundary, had
  // to lift their finger and place it *outside* the table before the page
  // would keep scrolling. No `overscroll-*-contain` class of any kind is
  // the correct, current behavior — default `overscroll-behavior: auto`
  // lets the page take over the instant this table can't scroll further,
  // which is the actually-expected mobile handoff. Asserting the absence
  // explicitly (not just "renders"), so a future re-introduction of any
  // containment here fails this test instead of silently reintroducing
  // the trap.
  it("carries no overscroll-containment class, so the page can take over scrolling at this table's own boundary", () => {
    renderWithProviders(<GenericTable items={ITEMS} />);

    const scrollContainer = screen.getByText("Epoch").closest("div.overflow-auto");
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer?.className).not.toMatch(/overscroll-/);
  });
});
