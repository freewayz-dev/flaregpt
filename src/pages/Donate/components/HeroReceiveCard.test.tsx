import { describe, it, expect, vi, afterEach } from "vitest";

import HeroReceiveCard from "@/pages/Donate/components/HeroReceiveCard";
import { DONATION_COINS } from "@/config/donation";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";

const flr = DONATION_COINS.find((c) => c.id === "flr")!;
const xrp = DONATION_COINS.find((c) => c.id === "xrp")!;

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...window.navigator, clipboard: { writeText } });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HeroReceiveCard", () => {
  it("copies exactly the coin's address when the Copy button is clicked, not a nickname or label", () => {
    const writeText = stubClipboard();
    renderWithProviders(<HeroReceiveCard coin={flr} />);

    fireEvent.click(screen.getByRole("button", { name: /Copy Address/i }));

    expect(writeText).toHaveBeenCalledWith(flr.address);
  });

  it("copies exactly the address when the address block itself is clicked", () => {
    const writeText = stubClipboard();
    renderWithProviders(<HeroReceiveCard coin={xrp} />);

    fireEvent.click(screen.getByText(xrp.address));

    expect(writeText).toHaveBeenCalledWith(xrp.address);
  });

  it("never renders any multisig UI or copy", () => {
    renderWithProviders(<HeroReceiveCard coin={flr} />);

    expect(screen.queryByText(/multi-signature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/multisig/i)).not.toBeInTheDocument();
  });

  it("never renders a Share affordance — copy is the only action", () => {
    renderWithProviders(<HeroReceiveCard coin={flr} />);

    expect(screen.queryByRole("button", { name: /Share/i })).not.toBeInTheDocument();
  });
});
