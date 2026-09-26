import { describe, it, expect } from "vitest";

import { rate } from "@/utils/webVitals";

// web.dev's own published Core Web Vitals thresholds — pinning the exact
// boundary values (not just "some value in each bucket") since an
// off-by-one here would silently mislabel a metric sitting right at the
// good/needs-improvement line.
describe("rate", () => {
  it("LCP: good at exactly 2500ms, needs-improvement just past it", () => {
    expect(rate("LCP", 2500)).toBe("good");
    expect(rate("LCP", 2501)).toBe("needs-improvement");
    expect(rate("LCP", 4000)).toBe("needs-improvement");
    expect(rate("LCP", 4001)).toBe("poor");
  });

  it("CLS: good at exactly 0.1, needs-improvement just past it", () => {
    expect(rate("CLS", 0.1)).toBe("good");
    expect(rate("CLS", 0.11)).toBe("needs-improvement");
    expect(rate("CLS", 0.25)).toBe("needs-improvement");
    expect(rate("CLS", 0.26)).toBe("poor");
  });

  it("INP: good at exactly 200ms, needs-improvement just past it", () => {
    expect(rate("INP", 200)).toBe("good");
    expect(rate("INP", 201)).toBe("needs-improvement");
    expect(rate("INP", 500)).toBe("needs-improvement");
    expect(rate("INP", 501)).toBe("poor");
  });

  it("an unrecognized metric name defaults to good rather than throwing", () => {
    expect(rate("SOME_FUTURE_METRIC", 999999)).toBe("good");
  });
});
