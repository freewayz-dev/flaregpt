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

  // FTSO Providers / Validators ranking tables + "Your Validator Stake" +
  // the Links page — shapes mirror the real backend responses confirmed
  // live against api.flaregpt.io directly (including the "Unknown
  // Provider"/no-name-resolution quirks), not guessed. `validator-stakes`
  // only ever returns NOT_STAKED here — the populated shape was never
  // observed against the real backend either (see networkService.js).
  http.get(`${API}/api/v1/ftso/provider-rankings`, () => {
    return HttpResponse.json({
      providers: [
        { address: "0x111246F191a2A20012723369d3CEc77777E774E9", name: "Flare.Space", weight_share_pct: 3.632, fee_pct: 20.0 },
        { address: "0x7e9bc5C2d12711bAB79e93eb5a6e6c6D9A084f8C", name: "Unknown Provider", weight_share_pct: 3.044, fee_pct: 20.0 },
      ],
    });
  }),

  http.get(`${API}/api/v1/network/validator-rankings`, () => {
    return HttpResponse.json({
      validators: [
        {
          node_id: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
          connected: true,
          uptime_pct: 100.0,
          stake_flr: 13340000.0,
          delegator_count: 25,
          fee_pct: 20.0,
        },
      ],
    });
  }),

  // NOT_STAKED is the default for every address except the one real staked
  // wallet found live via the PChainStakeMirror contract (see
  // YourValidatorStakeCard.jsx's top comment) — this trimmed sample mirrors
  // that wallet's real response shape (one "mirrored" aggregate entry +
  // "native" per-tranche entries, each with its own `end_time`).
  http.get(`${API}/api/v1/network/validator-stakes/:address`, ({ params }) => {
    if (params.address.toLowerCase() === "0x725789badfeda0de546e3d91f2e64115ba4face3") {
      return HttpResponse.json({
        status: "STAKED",
        wallet: "0x725789badFeda0de546e3d91f2E64115bA4FaCe3",
        p_chain_identity: "f4eaabbb9c4018112e16a956fa6a085d2bc7673d",
        stakes: [
          {
            source: "mirrored",
            node_id: "NodeID-AW81N9vGQttoQMMdpqbihU5hEwH793YXj",
            name: null,
            amount_flr: 981705.0,
            end_time: null,
            potential_reward_flr: null,
            uptime_pct: null,
            connected: null,
            fee_pct: null,
          },
          {
            source: "native",
            node_id: "NodeID-AW81N9vGQttoQMMdpqbihU5hEwH793YXj",
            name: null,
            amount_flr: 816425.0,
            end_time: "2026-08-30T07:00:00+00:00",
            potential_reward_flr: 0.0,
            uptime_pct: null,
            connected: null,
            fee_pct: null,
          },
        ],
      });
    }
    return HttpResponse.json({
      status: "NOT_STAKED",
      wallet: params.address,
      p_chain_identity: null,
      stakes: [],
    });
  }),

  http.get(`${API}/api/v1/links`, () => {
    return HttpResponse.json({
      links: [
        {
          id: "flare-portal",
          name: "Flare Portal",
          category: "core",
          description: "Official app for wrapping FLR/SGB, delegating to FTSO providers, staking, and governance voting.",
          official_site: "https://portal.flare.network/",
          docs_url: "https://dev.flare.network/",
          twitter: "https://twitter.com/FlareNetworks",
          discord: null,
          verified_at: "2026-08-09",
        },
        {
          id: "sceptre",
          name: "Sceptre",
          category: "defi-staking",
          description: "Liquid staking on Flare — stake FLR to receive sFLR, usable across other Flare DeFi apps.",
          official_site: "https://www.sceptre.fi/",
          docs_url: "https://romeblockchain.gitbook.io/sceptre-liquid-staking-documentation",
          twitter: "https://twitter.com/SceptreLS",
          discord: null,
          verified_at: "2026-08-09",
        },
        // The real API currently also returns one malformed, all-empty
        // record (confirmed live) — included here too so tests exercise
        // the same filtering the real page has to do, not a cleaner list
        // than what's actually served.
        { id: "", name: "", category: "", description: "", official_site: "https://", docs_url: "https://", twitter: "https://x.com/", discord: null, verified_at: "" },
      ],
    });
  }),

  http.get(`${API}/api/v1/links/categories`, () => {
    return HttpResponse.json({ categories: ["core", "defi-staking"] });
  }),
];
