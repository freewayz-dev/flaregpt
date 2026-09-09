import { describe, it, expect } from "vitest";

import FireFreshnessNote from "@/pages/Fire/components/FireFreshnessNote";
import { render, screen } from "@/test/test-utils";

describe("FireFreshnessNote", () => {
  it("renders nothing when there's no dataUpdatedAt yet (query hasn't resolved)", () => {
    const { container } = render(<FireFreshnessNote dataUpdatedAt={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'moments ago' copy for a fetch that just resolved", () => {
    render(<FireFreshnessNote dataUpdatedAt={Date.now()} />);
    expect(screen.getByText("Showing cached data from moments ago")).toBeInTheDocument();
  });

  it("shows the minutes-ago copy once at least a minute has passed", () => {
    render(<FireFreshnessNote dataUpdatedAt={Date.now() - 5 * 60_000} />);
    expect(screen.getByText("Showing cached data from 5 minutes ago")).toBeInTheDocument();
  });
});
