import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";

import { useAuthSync, logout } from "@/hooks/useAuthSync";
import { useDisconnectAllWallets } from "@/hooks/useDisconnectAllWallets";
import { useAuthStore } from "@/store/useAuthStore";
import { useConnection } from "wagmi";
import { renderWithProviders, screen, waitFor, fireEvent } from "@/test/test-utils";
import { server } from "@/test/mocks/server";
import { MOCK_AUTH_TOKEN } from "@/test/mocks/handlers";
import { API_BASE as API, TEST_ADDRESSES } from "@/test/fixtures";

function AuthSyncProbe() {
  useAuthSync();
  const token = useAuthStore((s) => s.token);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  return (
    <div>
      <p>token: {token || "(none)"}</p>
      <p>isAuthenticating: {String(isAuthenticating)}</p>
    </div>
  );
}

// The most complex piece of auth logic in the app, and — before this —
// never exercised end-to-end. A real connect (via the existing mock-wagmi
// AutoConnect path) should automatically drive nonce -> sign -> verify ->
// session, exactly like a real wallet connecting for the first time.
describe("useAuthSync — automatic sign-in ceremony", () => {
  it("creates a session automatically after a wallet connects", async () => {
    renderWithProviders(<AuthSyncProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });

    expect(await screen.findByText(`token: ${MOCK_AUTH_TOKEN}`)).toBeInTheDocument();
  });

  it("does not create a session when the signature is rejected", async () => {
    let nonceRequests = 0;
    server.use(
      http.post(`${API}/api/v1/auth/nonce`, () => {
        nonceRequests += 1;
        return HttpResponse.json({ message: "Sign this message: test-nonce" });
      }),
    );

    renderWithProviders(<AuthSyncProbe />, {
      wagmi: {
        connected: true,
        address: TEST_ADDRESSES.primary,
        features: { signMessageError: true },
      },
    });

    // Waiting on concrete signals (the nonce request actually happened,
    // then isAuthenticating settling back to false once the rejected
    // signature's catch block runs) rather than racing to catch a
    // transient "isAuthenticating: true" text that could easily flip back
    // before a query gets a chance to see it.
    await waitFor(() => expect(nonceRequests).toBeGreaterThan(0));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticating).toBe(false));
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe("logout()", () => {
  it("clears the local session even when the backend logout call fails", async () => {
    server.use(http.post(`${API}/api/v1/auth/logout`, () => HttpResponse.error()));
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    // logout()'s own comment states this is deliberate: local state clears
    // regardless of whether the network call succeeds. This is the test
    // that keeps it that way.
    await logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();
  });
});

function DisconnectProbe() {
  useAuthSync();
  const { isConnected } = useConnection();
  const disconnectAll = useDisconnectAllWallets();
  return (
    <div>
      <p>connected: {String(isConnected)}</p>
      <button onClick={() => disconnectAll()}>Disconnect</button>
    </div>
  );
}

describe("wallet disconnect", () => {
  it("never clears an existing session — connection and auth are deliberately decoupled", async () => {
    useAuthStore.setState({ token: MOCK_AUTH_TOKEN, authenticatedAddress: TEST_ADDRESSES.primary });

    renderWithProviders(<DisconnectProbe />, {
      wagmi: { connected: true, address: TEST_ADDRESSES.primary },
    });
    await screen.findByText("connected: true");

    fireEvent.click(screen.getByText("Disconnect"));
    await screen.findByText("connected: false");

    expect(useAuthStore.getState().token).toBe(MOCK_AUTH_TOKEN);
    expect(useAuthStore.getState().authenticatedAddress).toBe(TEST_ADDRESSES.primary);
  });
});
