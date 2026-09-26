
import { create } from "zustand";
import { persist } from "zustand/middleware";



// Authentication is deliberately independent of wallet *connection*.
// Disconnecting a wallet (see useDisconnectAllWallets) must never touch
// this store — only an explicit logout (see useAuthSync.js's exported
// `logout`) clears it. Persisted so the token survives reloads and even
// the browser restarting — the backend's own `/auth/verify` response
// confirms tokens expire after 30 days (`expires_in: 2592000`), not never
// (see apiClient.ts's 401 interceptor and useAuthSync.js's mount-time
// check, which are what actually notice an expired/revoked token and
// clear this store; persisting here just means a still-valid token
// doesn't need a fresh sign-in on every reload). The token is still the
// actual source of truth for "am I signed in" in the meantime, not
// whatever wagmi's connector happens to report at a given moment.
// `persist`'s own generics don't infer the state creator's type through a
// curried `create<AuthState>()(persist((set) => (...), options))` call by
// themselves — the explicit `: AuthState` return annotation below (and on
// `partialize`'s own `state` parameter) is what real inference needs here,
// not a workaround for a type error that reflects anything actually wrong.
export const useAuthStore = create()(
  persist(
    (set) => ({
      token: null,
      authenticatedAddress: null,
      isAuthenticating: false,
      connectedAddress: null,
      hasHydrated: false,

      beginAuthenticating: () => set({ isAuthenticating: true }),
      setSession: (token, address) =>
        set({ token, authenticatedAddress: address, isAuthenticating: false }),
      stopAuthenticating: () => set({ isAuthenticating: false }),
      clearAuth: () => set({ token: null, authenticatedAddress: null }),
      setConnectedAddress: (address) => set({ connectedAddress: address }),
    }),
    {
      name: "flaregpt_auth",
      partialize: (state) => ({
        token: state.token,
        authenticatedAddress: state.authenticatedAddress,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
