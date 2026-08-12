import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { queryKeys } from "@/services/queryKeys";
import { ROUTES } from "@/config/routes";

// R15: a large wallet's activity fetch can run for minutes (see
// useWalletActivityQueries.js — deliberately not cancelled on unmount), so
// a visitor who gets bored waiting and clicks elsewhere in the dashboard
// shouldn't lose that progress. Mounted once at the app-shell level
// (DashboardLayout, alongside useAuthSync) rather than inside the wallet
// page itself, since the whole point is to keep watching after that page's
// own component has unmounted.
//
// Subscribes directly to the QueryClient's cache rather than calling
// useWalletActivity() here — a live useQuery subscription would itself
// count as an "observer" keeping the query artificially active/fresh, and
// would re-render this (otherwise inert) hook's owner on every state
// change for no reason. The cache emits its own "updated" events
// independent of whether any component currently has a live subscription,
// which is exactly the signal needed here.
export function useWalletActivityNotifier() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pendingHashesRef = useRef(new Set());
  const locationRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  locationRef.current = location.pathname;
  navigateRef.current = navigate;

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const { query } = event;
      if (query.queryKey[0] !== queryKeys.walletActivity.all[0]) return;

      const onWalletPage = locationRef.current.startsWith(ROUTES.walletActivity);
      const hash = query.queryHash;

      if (query.state.fetchStatus === "fetching" && !onWalletPage) {
        pendingHashesRef.current.add(hash);
        return;
      }

      if (query.state.status !== "success" || !pendingHashesRef.current.has(hash)) {
        return;
      }
      pendingHashesRef.current.delete(hash);
      if (onWalletPage) return;

      toast.success(t("wallet.activity.notifier.ready"), {
        onClick: () => navigateRef.current(ROUTES.walletActivity),
      });
    });

    return unsubscribe;
  }, [queryClient, t]);
}
