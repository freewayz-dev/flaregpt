import type { Address } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  authenticatedAddress: Address | null;
  // Transient — deliberately excluded from persistence below, so a page
  // reload mid-sign-in never gets stuck "authenticating" forever.
  isAuthenticating: boolean;
  // A live mirror of wagmi's currently connected address (null when
  // disconnected) — not persisted, always recomputed fresh. This exists
  // purely so apiClient's request interceptor (a plain function with no
  // access to React/wagmi hooks) can tell whether `token` still belongs to
  // whoever is *actually* connected right now, without needing to touch
  // `token`/`authenticatedAddress` itself to enforce that — see
  // apiClient.js.
  connectedAddress: Address | null;

  beginAuthenticating: () => void;
  setSession: (token: string, address: Address) => void;
  stopAuthenticating: () => void;
  clearAuth: () => void;
  setConnectedAddress: (address: Address | null) => void;
}

// Authentication is deliberately independent of wallet *connection*.
// Disconnecting a wallet (see useDisconnectAllWallets) must never touch
// this store — only an explicit logout (see useAuthSync.js's exported
// `logout`) clears it. Persisted so the token survives reloads and even
// the browser restarting, matching the backend's "token does not expire"
// contract: the token is the actual source of truth for "am I signed in",
// not whatever wagmi's connector happens to report at a given moment.
// `persist`'s own generics don't infer the state creator's type through a
// curried `create<AuthState>()(persist((set) => (...), options))` call by
// themselves — the explicit `: AuthState` return annotation below (and on
// `partialize`'s own `state` parameter) is what real inference needs here,
// not a workaround for a type error that reflects anything actually wrong.
export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      token: null,
      authenticatedAddress: null,
      isAuthenticating: false,
      connectedAddress: null,

      beginAuthenticating: () => set({ isAuthenticating: true }),
      setSession: (token, address) =>
        set({ token, authenticatedAddress: address, isAuthenticating: false }),
      stopAuthenticating: () => set({ isAuthenticating: false }),
      clearAuth: () => set({ token: null, authenticatedAddress: null }),
      setConnectedAddress: (address) => set({ connectedAddress: address }),
    }),
    {
      name: "flaregpt_auth",
      partialize: (state: AuthState) => ({
        token: state.token,
        authenticatedAddress: state.authenticatedAddress,
      }),
    },
  ),
);
