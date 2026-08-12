import { describe, it, expect } from "vitest";

import GenericTable from "@/pages/Dashboard/components/shared/GenericTable";
import { renderWithProviders, screen } from "@/test/test-utils";

const ITEMS = [
  { epoch: 100, amount: 12.5, claimed: true },
  { epoch: 101, amount: 8.25, claimed: false },
];

describe("GenericTable — scroll containment", () => {
  // Regression guard for the table-scroll-trapping bug: this table has a
  // deliberate fixed height (see the component's own comment — a long
  // table scrolls internally rather than growing its card), so vertical
  // containment is correct here, but the *both-axis* `overscroll-contain`
  // this used to carry also silently blocked horizontal scroll/swipe on
  // narrow viewports (an axis with no scroll room of its own is already
  // "at its boundary" the instant a gesture starts, so `contain` blocked
  // it immediately). Asserting the exact single-axis class directly, not
  // just "some overscroll class exists", so a future revert back to the
  // blanket `overscroll-contain` fails this test instead of silently
  // reintroducing the bug.
  it("contains vertical overscroll but leaves horizontal overscroll free to chain", () => {
    renderWithProviders(<GenericTable items={ITEMS} />);

    const scrollContainer = screen.getByText("Epoch").closest("div.overflow-auto");
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer).toHaveClass("overscroll-y-contain");
    expect(scrollContainer).not.toHaveClass("overscroll-contain");
    expect(scrollContainer?.className).not.toMatch(/overscroll-x-contain/);
  });
});
