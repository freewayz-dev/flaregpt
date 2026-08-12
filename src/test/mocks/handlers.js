import { http, HttpResponse} from "msw";

import { API_BASE as API } from "@/test/fixtures";

// Exported so auth tests can assert against the exact value their session
// ends up with, rather than duplicating this literal independently.
export const MOCK_AUTH_TOKEN = "mock-jwt-token";

// Same reasoning — the id an authenticated first send's lazily-created
// conversation ends up with, so chat tests can assert against it directly.
export const MOCK_CONVERSATION_ID = "mock-conversation-id";

// Seed handler set for Phase 0 — just enough to prove MSW is genuinely
// intercepting requests through the app's real axios instances (see
// src/services/apiClient.js for the three base URLs this app actually
// calls).
//
// Phase 1 additions: the endpoints the wallet-gated pages actually call
// once `activeAddress` resolves to something real (see
// src/services/{watchlistService,dashboardService,rflrService,
// walletActivityService}.js for the exact shapes these mirror). Kept in
// this one file deliberately — the "split by service" threshold from the
// Phase 0 review isn't reached at this count; revisit if it starts feeling
// crowded, not before.
export const handlers = [
  http.get(`${API}/health`, () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Empty by default — most Phase 1 tests care about a *connected primary*
  // wallet, not a watchlist; tests that specifically need watchlist
  // entries override this per-test via `server.use(...)`.
  http.get(`${API}/api/v1/watchlist`, () => {
    return HttpResponse.json({ wallets: [] });
  }),

  http.get(`${API}/api/v1/portfolio/balances/:address`, () => {
    return HttpResponse.json({ balances: { FLR: 1234.5678, WFLR: 500 } });
  }),

  http.get(`${API}/api/v1/portfolio/ftso/:address`, () => {
    return HttpResponse.json({
      ftso_infrastructure: { user_wflr_balance: 500, cumulative_unclaimed_flr: 12.5 },
      realtime_estimation: {
        estimated_hourly_earning: 0.05,
        calculation_method: "LIVE_UNCLAIMED_LEDGER_VELOCITY",
      },
      active_delegations: [
        { provider_address: "0xProvider1", provider_name: "Test Provider", allocated_bips: 10000 },
      ],
      unclaimed_epochs_ledger: [],
    });
  }),

  http.get(`${API}/api/v1/rflr/exit-quote/:address`, () => {
    return HttpResponse.json({
      total_balance: 1000,
      liquid_now: 400,
      locked_vesting: 600,
      net_payout_if_exiting: 380,
      exit_penalty_cost: 20,
      efficiency_ratio: "82.43%",
    });
  }),

  http.get(`${API}/api/v1/rflr/melt-schedule/:address`, () => {
    return HttpResponse.json({ data: [] });
  }),

  http.get(`${API}/api/v1/portfolio/activity/:address`, () => {
    return HttpResponse.json({ history: [], total_actions_indexed: 0 });
  }),

  http.get(`${API}/api/v1/loops/gas-sniper/status`, () => {
    return HttpResponse.json({ status: "inactive" });
  }),

  // Phase 2 additions — the sign-in ceremony and the interceptors guarding
  // it (see src/services/authService.js for the real shapes these mirror).
  http.post(`${API}/api/v1/auth/nonce`, () => {
    return HttpResponse.json({ message: "Sign this message to verify your wallet: test-nonce" });
  }),

  http.post(`${API}/api/v1/auth/verify`, () => {
    return HttpResponse.json({ token: MOCK_AUTH_TOKEN });
  }),

  http.post(`${API}/api/v1/auth/logout`, () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Echoes back whatever Authorization header it actually received —
  // apiClient.js's interceptor tests call this real endpoint directly and
  // inspect the echo, rather than needing a dedicated fake endpoint just
  // for testing.
  http.get(`${API}/api/v1/auth/me`, ({ request }) => {
    return HttpResponse.json({ receivedAuthHeader: request.headers.get("Authorization") });
  }),

  // wagmi's own mock connector (see mocks/wagmi.js) does NOT fake message
  // signing locally — confirmed by reading its source: `personal_sign`
  // (used by useSignMessage(), which the real sign-in ceremony calls) gets
  // rewritten to `eth_sign` and then genuinely proxied over JSON-RPC to
  // whatever transport the chain is configured with, which for the `flare`
  // chain (see web3Config.js) is the real mainnet RPC endpoint. Without
  // this, any test driving an actual sign — not just a connect — makes a
  // real network call MSW's `onUnhandledRequest: "error"` correctly flags
  // as a bug. The exact signature value returned doesn't matter to
  // anything this app checks (authService.verifySignature's mock below
  // doesn't validate it either) — only that signing resolves at all.
  http.post(
    "https://flare-api.flare.network/ext/C/rpc",
    async ({ request }) => {
      const body = await request.json();
      if (body.method === "eth_sign") {
        return HttpResponse.json({ jsonrpc: "2.0", id: body.id, result: `0x${"ab".repeat(65)}` });
      }
      return HttpResponse.json(
        { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: `Unhandled mock RPC method: ${body.method}` } },
        { status: 200 },
      );
    },
  ),

  // Phase 3 additions — the two real REST calls an authenticated first
  // chat send makes around the WebSocket exchange itself (lazy conversation
  // creation, and its rollback on a failed first send — see
  // src/services/chatService.js for the real shapes these mirror).
  http.post(`${API}/api/v1/chat/conversations`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: MOCK_CONVERSATION_ID,
      title: body.title ?? null,
      created_at: 0,
      updated_at: 0,
      message_count: 0,
    });
  }),

  http.delete(`${API}/api/v1/chat/conversations/:id`, ({ params }) => {
    return HttpResponse.json({ status: "deleted", id: params.id });
  }),
];
