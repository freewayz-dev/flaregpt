import { describe, it, expect } from "vitest";

import CodeBlock from "@/components/flareGpt/CodeBlock";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("CodeBlock — copy button accessibility", () => {
  it("has an accessible name, not just an icon", () => {
    renderWithProviders(<CodeBlock language="ts">const x = 1;</CodeBlock>);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});
