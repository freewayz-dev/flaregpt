import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useAuthStore } from "@/store/useAuthStore";
import { useWalletHubStore } from "@/store/useWalletHubStore";
import * as watchlistService from "@/services/watchlistService";
import { queryKeys } from "@/services/queryKeys";

// Mounted once at the app root (see App.jsx), mirroring useAuthSync's
// mount-once shape. Every genuine guest -> signed-in transition (not just
// the first one ever — logging out and back in later with fresh local
// wallets tracked in between should sync those too) folds whatever this
// browser was tracking as a guest into the now-authenticated account, then
// clears the local copy so it can never double-add on a future sign-in or
// linger for a later guest session on the same browser.
export function useWatchlistSync() {
  const hasSession = useAuthStore((state) => Boolean(state.token));
  const queryClient = useQueryClient();
  const prevHasSessionRef = useRef(hasSession);

  useEffect(() => {
    const justSignedIn = hasSession && !prevHasSessionRef.current;
    prevHasSessionRef.current = hasSession;
    if (!justSignedIn) return;

    const localWallets = useWalletHubStore.getState().trackedWallets;
    if (localWallets.length === 0) return;

    const authenticatedAddress = useAuthStore.getState().authenticatedAddress?.toLowerCase();

    (async () => {
      let syncedAny = false;
      for (const wallet of localWallets) {
        // Tracking your own now-authenticated address as a separate
        // "watchlist" entry would be redundant — it's already the Primary
        // wallet everywhere allWallets is built.
        if (wallet.address.toLowerCase() === authenticatedAddress) continue;
        try {
          await watchlistService.addWatchlistWallet(wallet.address, wallet.label);
          syncedAny = true;
        } catch (error) {
          // 409 means the account already has this address tracked (a
          // prior sync from another device, or an earlier session) — that
          // IS the desired end state, not a failure. Any other error just
          // leaves that one address unsynced; this is a best-effort
          // background merge, not a user-facing action with its own
          // error UI.
          if (isAxiosError(error) && error.response?.status === 409) syncedAny = true;
        }
      }

      // The local guest list has now been folded into the account (or
      // already existed there) — clearing it is what prevents it from
      // reappearing for a later guest session on this browser, and from
      // being re-synced (duplicated attempts) on a future sign-in.
      useWalletHubStore.setState({ trackedWallets: [] });

      if (syncedAny) {
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      }
    })();
  }, [hasSession, queryClient]);
}
