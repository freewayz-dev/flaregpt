import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { flareApi } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useCacheStatusStore } from "@/store/useCacheStatusStore";
import { server } from "@/test/mocks/server";
import { MOCK_AUTH_TOKEN } from "@/test/mocks/handlers";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

// The real security boundary between "signed in as wallet A" and "wallet
// B is now connected" — GET /api/v1/auth/me's mock handler (see
// mocks/handlers.js) echoes back whatever Authorization header it actually
// received, so these tests inspect the real interceptor's real output
// rather than reimplementing its logic to check against.
describe("apiClient request interceptor", () => {
  it("attaches the Bearer token when the authenticated and connected wallets match", async () => {
    useAuthStore.setState({
      token: MOCK_AUTH_TOKEN,
      authenticatedAddress: TEST_ADDRESSES.primary,
      connectedAddress: TEST_ADDRESSES.primary,
    });
    const { data } = await flareApi.get("/api/v1/auth/me");
    expect(data.receivedAuthHeader).toBe(`Bearer ${MOCK_AUTH_TOKEN}`);
  });

  it("withholds the Bearer token when a different wallet is now connected than the one that signed in", async () => {
    useAuthStore.setState({
      token: MOCK_AUTH_TOKEN,
      authenticatedAddress: TEST_ADDRESSES.primary,
      connectedAddress: TEST_ADDRESSES.watchlist,
    });
    const { data } = await flareApi.get("/api/v1/auth/me");
    expect(data.receivedAuthHeader).toBeNull();
  });

  it("still attaches the token when no wallet is connected at all — auth outlives connection by design", async () => {
    useAuthStore.setState({
      token: MOCK_AUTH_TOKEN,
      authenticatedAddress: TEST_ADDRESSES.primary,
      connectedAddress: null,
    });
    const { data } = await flareApi.get("/api/v1/auth/me");
    expect(data.receivedAuthHeader).toBe(`Bearer ${MOCK_AUTH_TOKEN}`);
  });

  it("sends no Authorization header when there is no session", async () => {
    const { data } = await flareApi.get("/api/v1/auth/me");
    expect(data.receivedAuthHeader).toBeNull();
  });
});

describe("apiClient response interceptor", () => {
  it("clears the session on a 401 when a token was actually present", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });
    server.use(http.get(`${API}/api/v1/watchlist`, () => new HttpResponse(null, { status: 401 })));

    await expect(flareApi.get("/api/v1/watchlist")).rejects.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("does not touch auth state on a 401 for a guest who was never signed in — an expected 401, not a session failure", async () => {
    server.use(http.get(`${API}/api/v1/watchlist`, () => new HttpResponse(null, { status: 401 })));

    await expect(flareApi.get("/api/v1/watchlist")).rejects.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

// This is the client-side half of the staleness indicator — the service
// worker side (does a cache-served financial-reads response actually carry
// this header?) is covered live in docs/pwa/phase-2-caching.md, not here:
// MSW intercepts requests before they'd ever reach a real service worker,
// so there's no SW in this test environment to exercise. What *is*
// meaningfully testable here, and worth pinning down, is that the
// interceptor correctly reads whatever header a response actually carries
// and updates the shared store accordingly — real coverage of real logic,
// not a re-test of Workbox's own strategy implementation.
describe("apiClient cache-freshness tracking", () => {
  it("marks the store as cache-served when a response carries the service worker's marker header", async () => {
    server.use(
      http.get(`${API}/api/v1/overview/market`, () =>
        HttpResponse.json({ ok: true }, { headers: { "X-FlareGPT-Cache": "hit" } }),
      ),
    );
    await flareApi.get("/api/v1/overview/market");
    expect(useCacheStatusStore.getState().cachedAt).not.toBeNull();
  });

  it("marks the store fresh again once a live (unmarked) response comes back", async () => {
    useCacheStatusStore.setState({ cachedAt: Date.now() });
    server.use(http.get(`${API}/api/v1/overview/market`, () => HttpResponse.json({ ok: true })));

    await flareApi.get("/api/v1/overview/market");
    expect(useCacheStatusStore.getState().cachedAt).toBeNull();
  });

  it("ignores the header on a non-GET response — a mutation is never what this indicator is about", async () => {
    server.use(
      http.post(`${API}/api/v1/watchlist`, () =>
        HttpResponse.json({ ok: true }, { headers: { "X-FlareGPT-Cache": "hit" } }),
      ),
    );
    await flareApi.post("/api/v1/watchlist", { address: TEST_ADDRESSES.primary });
    expect(useCacheStatusStore.getState().cachedAt).toBeNull();
  });

  // Regression coverage for a real bug: `flareApi` also carries never-cached
  // (auth/watchlist/chat) and stale-while-revalidate (network/gas-sniper-
  // status) traffic through this same instance. Neither tier ever carries
  // the marker header, so a live response on either one used to be
  // indistinguishable from "the financial-reads tier is live again" and
  // would incorrectly clear a genuine financial-reads staleness flag.
  it("does not clear the staleness flag when a live response comes back on an unrelated (non financial-reads) endpoint", async () => {
    useCacheStatusStore.setState({ cachedAt: Date.now() });
    server.use(
      http.get(`${API}/api/v1/watchlist`, () => HttpResponse.json({ ok: true })),
      http.get(`${API}/api/v1/network/status`, () => HttpResponse.json({ ok: true })),
    );

    await flareApi.get("/api/v1/watchlist");
    expect(useCacheStatusStore.getState().cachedAt).not.toBeNull();

    await flareApi.get("/api/v1/network/status");
    expect(useCacheStatusStore.getState().cachedAt).not.toBeNull();
  });

  it("still clears the staleness flag once a live response comes back on the financial-reads tier itself", async () => {
    useCacheStatusStore.setState({ cachedAt: Date.now() });
    server.use(http.get(`${API}/api/v1/rflr/vesting/${TEST_ADDRESSES.primary}`, () => HttpResponse.json({ ok: true })));

    await flareApi.get(`/api/v1/rflr/vesting/${TEST_ADDRESSES.primary}`);
    expect(useCacheStatusStore.getState().cachedAt).toBeNull();
  });
});
