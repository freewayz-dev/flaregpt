import { defineConfig, devices } from "@playwright/test";

const PORT = 4500;

// Runs against the real production build, served the way Vercel actually
// serves it — see e2e/static-server.ts for why `vite preview`/the dev
// server can't stand in here. Rebuilding on every run also means this is,
// structurally, a standing check that `npm run build` (including
// prerender.js) still succeeds.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && node e2e/static-server.js`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E_PORT: String(PORT) },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
