import { describe, it, expect } from "vitest";
import userEvent from "@testing-library/user-event";

import InfoHint from "@/components/common/InfoHint";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("InfoHint", () => {
  // Openness is driven by Tailwind's `invisible`/`opacity-0` classes, not a
  // conditional mount — jsdom has no real stylesheet to resolve those into
  // computed visibility, so assertions here check the class list (and the
  // authoritative aria-expanded state) rather than `toBeVisible()`.
  function popover() {
    return screen.getByText("Body copy.").closest("div");
  }

  it("hides the popover initially and exposes aria-haspopup/aria-expanded on the trigger", () => {
    renderWithProviders(<InfoHint label="TVL">Body copy.</InfoHint>);

    const trigger = screen.getByRole("button", { name: "TVL" });
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(popover()).toHaveClass("invisible", "opacity-0");
  });

  it("opens on click and closes again on a second click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InfoHint label="TVL">Body copy.</InfoHint>);

    const trigger = screen.getByRole("button", { name: "TVL" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(popover()).toHaveClass("opacity-100");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(popover()).toHaveClass("invisible", "opacity-0");
  });

  it("opens via keyboard activation (Enter on the focused trigger)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InfoHint label="TVL">Body copy.</InfoHint>);

    await user.tab();
    expect(screen.getByRole("button", { name: "TVL" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "TVL" })).toHaveAttribute("aria-expanded", "true");
    expect(popover()).toHaveClass("opacity-100");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InfoHint label="TVL">Body copy.</InfoHint>);

    await user.click(screen.getByRole("button", { name: "TVL" }));
    expect(popover()).toHaveClass("opacity-100");

    await user.keyboard("{Escape}");
    expect(popover()).toHaveClass("invisible", "opacity-0");
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <InfoHint label="TVL">Body copy.</InfoHint>
        <button type="button">Elsewhere</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "TVL" }));
    expect(popover()).toHaveClass("opacity-100");

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(popover()).toHaveClass("invisible", "opacity-0");
  });
});
