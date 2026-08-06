import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { flareApi } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
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
