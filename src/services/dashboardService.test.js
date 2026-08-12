import { describe, it, expect } from "vitest";

import { fetchHealth } from "@/services/dashboardService";

// Phase 0 smoke test — proves MSW is genuinely intercepting requests made
// through the app's real `flareApi` axios instance (see
// src/test/mocks/server.js / handlers.js), not silently doing nothing.
// `onUnhandledRequest: "error"` in setup.js means this would fail loudly
// if the mock weren't actually wired up correctly.
describe("fetchHealth", () => {
  it("resolves with the mocked /health response", async () => {
    await expect(fetchHealth()).resolves.toEqual({ status: "ok" });
  });
});
