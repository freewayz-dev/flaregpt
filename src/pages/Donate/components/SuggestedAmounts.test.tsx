import { describe, it, expect, vi, afterEach } from "vitest";

import SuggestedAmounts from "@/pages/Donate/components/SuggestedAmounts";
import { DONATION_COINS } from "@/config/donation";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";

const flr = DONATION_COINS.find((c) => c.id === "flr")!;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SuggestedAmounts", () => {
  it("copies exactly the coin's address when a suggested amount tile is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, clipboard: { writeText } });

    renderWithProviders(<SuggestedAmounts coin={flr} />);
    fireEvent.click(screen.getByText(flr.suggestedAmounts[0].toLocaleString()));

    expect(writeText).toHaveBeenCalledWith(flr.address);
  });
});
