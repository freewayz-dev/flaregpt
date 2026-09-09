import { describe, it, expect } from "vitest";

import RankingAvatar from "@/pages/FtsoRewards/components/RankingAvatar";
import { render, screen, fireEvent } from "@/test/test-utils";

describe("RankingAvatar", () => {
  it("shows the first letter of the name, uppercased", () => {
    render(<RankingAvatar name="ITB Validator" />);
    expect(screen.getByText("I")).toBeInTheDocument();
  });

  it("uppercases a lowercase name's initial", () => {
    render(<RankingAvatar name="flare.space" />);
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  // The real complaint this guards against: a validator with no
  // registered name (a real, common state) was showing a bare "?" —
  // an unclear placeholder the design explicitly should never show for
  // a row that actually has *some* real identifying data (its NodeID),
  // even without a name. Every real validator row always has one.
  it("uses fallbackInitial, not '?', when there's no name but a fallback is given", () => {
    render(<RankingAvatar name={undefined} fallbackInitial="6" />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });

  it("prefers the real name's initial over fallbackInitial when both are given", () => {
    render(<RankingAvatar name="ITB Validator" fallbackInitial="6" />);
    expect(screen.getByText("I")).toBeInTheDocument();
    expect(screen.queryByText("6")).not.toBeInTheDocument();
  });

  // "?" only remains as a defensive last resort for a row with neither a
  // name nor a fallback identifier — not a state any real provider or
  // validator row reaches (providers always have a real name string, even
  // "Unknown Provider"; validators always have a real NodeID).
  it("falls back to a bare '?' only when there's neither a name nor a fallbackInitial", () => {
    render(<RankingAvatar name={undefined} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("sizes itself via the size prop, defaulting to 32px", () => {
    render(<RankingAvatar name="Bifrost Wallet" />);
    const avatar = screen.getByText("B");
    expect(avatar).toHaveStyle({ width: "32px", height: "32px" });
  });

  it("respects a custom size", () => {
    render(<RankingAvatar name="Bifrost Wallet" size={24} />);
    const avatar = screen.getByText("B");
    expect(avatar).toHaveStyle({ width: "24px", height: "24px" });
  });

  it("renders a real <img> instead of the initials circle when logoSrc is given", () => {
    // `alt=""` (deliberately decorative — the name is already shown as
    // real text right next to this avatar) maps to no accessible role,
    // so this queries the DOM directly rather than via getByRole("img").
    const { container } = render(<RankingAvatar name="Kiln" logoSrc="/assets/kiln.png" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/assets/kiln.png");
    expect(screen.queryByText("K")).not.toBeInTheDocument();
  });

  // The real regression this guards against: an earlier version hid the
  // broken <img> on error but never actually fell back to the initials
  // circle, leaving blank space instead of a usable avatar.
  it("falls back to the initials circle if the image fails to load", () => {
    const { container } = render(<RankingAvatar name="Kiln" logoSrc="/assets/broken.png" />);
    const img = container.querySelector("img");
    fireEvent.error(img);
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});
