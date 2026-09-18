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
        {
          provider_address: "0xProvider1",
          provider_name: "Test Provider",
          allocated_bips: 10000,
          network_rank: 5,
          concentration_band: "concentrated",
        },
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

  // The conversation list itself — powers useConversations()/the history
  // panel (see FlareWidget.test.jsx). One fixed conversation is enough for
  // that panel to have something real to render; tests that need more
  // override this per-test via `server.use(...)`.
  http.get(`${API}/api/v1/chat/conversations`, () => {
    return HttpResponse.json({
      conversations: [
        { id: MOCK_CONVERSATION_ID, title: "Existing conversation", created_at: 0, updated_at: 0, message_count: 2 },
      ],
    });
  }),

  // The full transcript for that one conversation — hit when switching
  // into it from the history panel (see FlareWidget.test.jsx).
  http.get(`${API}/api/v1/chat/conversations/${MOCK_CONVERSATION_ID}`, () => {
    return HttpResponse.json({
      id: MOCK_CONVERSATION_ID,
      title: "Existing conversation",
      created_at: 0,
      updated_at: 0,
      messages: [
        { role: "user", content: "hi", timestamp: 0 },
        { role: "assistant", content: "hello", timestamp: 0 },
      ],
    });
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

  // `name` confirmed live for only *some* validators — the backend added
  // name resolution after this fixture was first written, but a full
  // check of the real 20-entry response found a literal `name: null` on
  // 8 of them, not a rare edge case. Both real entries kept here so tests
  // exercise the fallback path too, not just the happy one.
  http.get(`${API}/api/v1/network/validator-rankings`, () => {
    return HttpResponse.json({
      validators: [
        {
          node_id: "NodeID-8qMWVar3hLdLSSgbTV57brpqUNjJuU2H8",
          name: "ITB Validator",
          connected: true,
          uptime_pct: 100.0,
          stake_flr: 13340000.0,
          delegator_count: 25,
          fee_pct: 20.0,
        },
        {
          node_id: "NodeID-6Ww2bagQbUaZppGWFdBcGamtNDtjap1sD",
          name: null,
          connected: true,
          uptime_pct: 100.0,
          stake_flr: 1090000.0,
          delegator_count: 8,
          fee_pct: 20.0,
        },
      ],
    });
  }),

  http.get(`${API}/api/v1/ftso/delegation-concentration`, () => {
    return HttpResponse.json({
      current: {
        hhi: 163.3,
        concentration_band: "unconcentrated",
        effective_num_providers: 61.24,
        num_active_providers: 98,
        top5_share_pct: 16.32,
        top10_share_pct: 28.55,
      },
      history: [
        {
          date: "2026-09-08",
          hhi: 164.2,
          concentration_band: "unconcentrated",
          effective_num_providers: 60.89,
          num_active_providers: 100,
          top5_share_pct: 15.77,
          top10_share_pct: 28.86,
        },
        {
          date: "2026-09-09",
          hhi: 163.3,
          concentration_band: "unconcentrated",
          effective_num_providers: 61.24,
          num_active_providers: 98,
          top5_share_pct: 16.32,
          top10_share_pct: 28.55,
        },
      ],
      note: "HHI measures how concentrated FTSO delegation weight is across providers.",
    });
  }),

  http.get(`${API}/api/v1/fire/overview`, () => {
    return HttpResponse.json({
      pools: [
        {
          id: "fdc",
          label: "FDC (attestation fees)",
          address: "0x0ce6831DF00A6018c4d316009980DbAa6c44E525",
          token: "FLR",
          balance: 2211064.386317,
          usd_value: 14342.09,
          burned: 0.0,
          burned_usd: 0.0,
        },
        {
          id: "fasset_minting_fee",
          label: "FAsset minting fees",
          address: "0xF55bcAd5568d1584ab6f013f144e1e433Ee551C7",
          token: "FXRP",
          balance: 14096.617233,
          usd_value: 20017.2,
          burned: 0.0,
          burned_usd: 0.0,
        },
      ],
      total_usd: 34359.29,
      total_burned_usd: 0.0,
      note: "Covers confirmed FIRE revenue pools — not necessarily all of them.",
    });
  }),

  // Default: the normal, healthy "flaremetrics" state (source/degraded
  // both match what Fire/index.jsx branches on) with a short daily_history
  // so any test exercising the page's happy path also gets a resolvable
  // trend-chart query by default, without needing a per-test override.
  // Fire's own test file overrides this per-case for the states it
  // actually asserts on (degraded/partial, onchain_fallback, no history).
  http.get(`${API}/api/v1/fire/overview/v2`, () => {
    return HttpResponse.json({
      source: "flaremetrics",
      generated_at: "2026-09-17T23:15:28Z",
      attribution: "Data provided by FlareMetrics (flaremetrics.io)",
      degraded: false,
      degraded_reason: null,
      pools: [
        {
          id: "fdc",
          label: "FDC (attestation fees)",
          token: "FLR",
          recipient: "0x0ce6831df00a6018c4d316009980dbaa6c44e525",
          accrued: "2667634200000000000000000",
          claimed: "2509006500000000000000000",
        },
      ],
      latest_epoch: {
        rewardEpochId: 434,
        estimatedWei: "7407000000000000000000",
        claimedWei: "0",
        deltaWei: "7407000000000000000000",
      },
      daily_history: [
        { stream: "fdc", token: "FLR", periodId: "2026-09-16", accrued: "1000000000000000000000", claimed: "0" },
        { stream: "fdc", token: "FLR", periodId: "2026-09-17", accrued: "1200000000000000000000", claimed: "0" },
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
