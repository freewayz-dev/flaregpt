import { create } from "zustand";

import * as authService from "@/services/authService";

// Tracks whether the connected (primary) wallet has been authenticated.
// Tracked/read-only wallets never go through this — only the wallet a user
// actually controls can sign a message and establish a session. Session
// state is intentionally NOT persisted to localStorage: it should be
// re-established from a real signature each time a real backend exists.
export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  isAuthenticating: false,
  address: null,
  session: null,

  signIn: async (address) => {
    if (get().isAuthenticating || get().address === address) return;
    set({ isAuthenticating: true });

    try {
      const session = await authService.signIn(address);
      set({ isAuthenticated: true, isAuthenticating: false, address, session });
    } catch {
      set({ isAuthenticating: false });
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ isAuthenticated: false, address: null, session: null });
  },
}));
