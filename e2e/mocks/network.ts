import type { Page } from "@playwright/test";

import { API_BASE as API } from "../../src/test/fixtures";

const MOCK_TOKEN = "e2e-mock-jwt-token";

// The few REST calls the three journeys actually make. The handler logic
// itself is deliberately not shared with src/test/mocks/handlers.js (MSW)
// — different interception APIs (page.route vs. MSW request handlers), kept
// self-contained per the plan's "no cross-tool fixture sharing" call — but
// the API host string is just a fixture value (same category as
// TEST_ADDRESSES, same file), so it's still the one canonical source
// rather than a seventh hand-typed copy.
export async function mockRestEndpoints(page: Page) {
  await page.route(`${API}/api/v1/watchlist`, (route) =>
    route.fulfill({ json: { wallets: [] } }),
  );

  await page.route(`${API}/api/v1/portfolio/balances/*`, (route) =>
    route.fulfill({ json: { balances: { FLR: 1234.5678, WFLR: 500 } } }),
  );

  // Connecting the mock wallet auto-triggers useAuthSync's sign-in
  // ceremony (nonce -> personal_sign -> verify) — see useAuthSync.js. The
  // injected wallet itself answers personal_sign locally (no network
  // call), but nonce/verify are real REST calls that need a response or
  // the connect step hangs waiting on a real backend.
  await page.route(`${API}/api/v1/auth/nonce`, (route) =>
    route.fulfill({ json: { message: "Sign this message to verify your wallet: e2e-nonce" } }),
  );

  await page.route(`${API}/api/v1/auth/verify`, (route) =>
    route.fulfill({ json: { token: MOCK_TOKEN } }),
  );
}

// Full WebSocket mock — chatSocket.js connects to
// wss://api.flaregpt.io/ws/chat/{address}[?token=...]. Not calling
// ws.connectToServer() means Playwright never opens a real connection at
// all, matching the same "fully mocked, no pass-through" approach Phase 3
// used with MSW's ws.link().
export async function mockChatSocket(page: Page, { reply = "Mocked reply." }: { reply?: string } = {}) {
  await page.routeWebSocket(/wss:\/\/api\.flaregpt\.io\/ws\/chat\/.*/, (ws) => {
    ws.onMessage(() => {
      ws.send(JSON.stringify({ type: "status", content: "Thinking..." }));
      ws.send(JSON.stringify({ type: "token", content: reply }));
      ws.send(JSON.stringify({ type: "done", conversation_id: null }));
    });
  });
}
