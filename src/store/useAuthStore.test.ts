import { describe, it, expect } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";

// The store's own persist config (`partialize`) is what actually decides
// what survives a reload — this tests that decision directly, not just the
// individual actions, since a regression here is invisible in normal
// runtime behavior (the excluded fields still work fine in-memory) and
// would only surface as "stuck mid-sign-in after a reload," a real footgun
// called out in the store's own comments.
describe("useAuthStore persisted shape", () => {
  it("persists token and authenticatedAddress but not isAuthenticating or connectedAddress", () => {
    useAuthStore.setState({
      token: "some-token",
      authenticatedAddress: "0xabc",
      isAuthenticating: true,
      connectedAddress: "0xdef",
    });

    const persistOptions = useAuthStore.persist.getOptions();
    // The store's own persist config always defines `partialize` (that's
    // exactly what this test is verifying) — zustand's own type just
    // can't express "this specific store's options always set it".
    const persisted = persistOptions.partialize!(useAuthStore.getState());

    expect(persisted).toEqual({
      token: "some-token",
      authenticatedAddress: "0xabc",
    });
    expect(persisted).not.toHaveProperty("isAuthenticating");
    expect(persisted).not.toHaveProperty("connectedAddress");
  });
});

describe("useAuthStore actions", () => {
  it("clearAuth clears the session without touching connectedAddress", () => {
    useAuthStore.setState({
      token: "some-token",
      authenticatedAddress: "0xabc",
      connectedAddress: "0xabc",
    });

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().authenticatedAddress).toBeNull();
    // clearAuth is the *auth* boundary only — disconnecting the wallet is
    // a separate concern (see useAuthSync.test.jsx) and must never be a
    // side effect of it.
    expect(useAuthStore.getState().connectedAddress).toBe("0xabc");
  });

  it("setSession sets the session and clears isAuthenticating", () => {
    useAuthStore.setState({ isAuthenticating: true });
    useAuthStore.getState().setSession("new-token", "0xabc");

    expect(useAuthStore.getState().token).toBe("new-token");
    expect(useAuthStore.getState().authenticatedAddress).toBe("0xabc");
    expect(useAuthStore.getState().isAuthenticating).toBe(false);
  });
});
