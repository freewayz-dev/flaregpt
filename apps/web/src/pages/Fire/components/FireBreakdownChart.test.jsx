import { describe, it, expect } from "vitest";

import FireBreakdownChart from "@/pages/Fire/components/FireBreakdownChart";
import { renderWithProviders, screen } from "@/test/test-utils";

const POOLS = [
  { id: "fdc", label: "FDC (attestation fees)", token: "FLR", usd_value: 14342.09 },
  { id: "fasset_minting_fee", label: "FAsset minting fees", token: "FXRP", usd_value: 20017.2 },
];

describe("FireBreakdownChart", () => {
  it("renders the card title and subtitle without crashing", () => {
    // recharts' ResponsiveContainer needs a real layout engine to size
    // itself, which jsdom doesn't provide — same limitation this app's
    // other chart tests (e.g. DelegationConcentrationCard.test.jsx) already
    // work around by asserting the surrounding card renders correctly
    // rather than inspecting recharts' own internal SVG output.
    renderWithProviders(<FireBreakdownChart pools={POOLS} />);
    expect(screen.getByText("Revenue by Category")).toBeInTheDocument();
    expect(screen.getByText("USD value tracked so far, by fee category")).toBeInTheDocument();
  });

  it("doesn't crash with only a single pool", () => {
    renderWithProviders(<FireBreakdownChart pools={[POOLS[0]]} />);
    expect(screen.getByText("Revenue by Category")).toBeInTheDocument();
  });
});
