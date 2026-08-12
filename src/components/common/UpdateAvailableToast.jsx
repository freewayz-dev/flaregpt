import { toast } from "react-toastify";

import { useFlareGptStore, isChatGenerating } from "@/store/useFlareGptStore";
import { UpdateToastContent } from "@/components/common/UpdateToastContent";
import i18n from "@/i18n";

const TOAST_ID = "pwa-update-available";

// Correctness-affecting, unlike the install banner's snooze — this isn't
// "come back in a couple of days," it's "you're still one reload away
// from the version that's already sitting there waiting." Re-offering
// within the same session (rather than only on the next full launch) is
// what keeps a long-lived open tab from silently running stale code
// indefinitely just because the user closed the toast once.
const RETRY_DELAY_MS = 60 * 60 * 1000; // ~1 hour floor, see scheduleRetry

// At most one retry (timer, or the focus/visibilitychange listener pair
// once the timer's fired) is ever outstanding at a time — see
// `scheduleRetry` below, the sole reader/writer of this module-level
// handle. `onNeedRefresh` (main.tsx) can genuinely fire more than once in
// one session if a second service-worker update lands before the first's
// retry has resolved; without this, dismissing both would leave two
// independent timer/listener pairs armed at once, each targeting its own
// (possibly by-then-stale) `applyUpdate` closure.
let cancelPendingRetry = null;

// Re-shows the update prompt the next time this tab is actually returned
// to, not on a bare timer — so someone mid-task never gets interrupted by
// the prompt reappearing out of nowhere. The hour is a floor before these
// listeners even get attached, not the trigger itself: without it, a
// normal tab-switch a couple of minutes after dismissing would re-show
// the prompt almost immediately, which is exactly the "still feels naggy"
// behavior this is meant to avoid.
function scheduleRetry(applyUpdate) {
  // A newer dismissed update supersedes whatever retry was already
  // pending for an older one, rather than stacking a second timer/
  // listener pair alongside the first.
  cancelPendingRetry?.();

  const timeoutId = setTimeout(() => {
    const showAgain = () => {
      window.removeEventListener("focus", showAgain);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelPendingRetry = null;
      promptForUpdate(applyUpdate);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") showAgain();
    };

    window.addEventListener("focus", showAgain);
    document.addEventListener("visibilitychange", onVisibilityChange);
    cancelPendingRetry = () => {
      window.removeEventListener("focus", showAgain);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, RETRY_DELAY_MS);

  cancelPendingRetry = () => clearTimeout(timeoutId);
}

// Called once, from main.tsx's `registerSW({ onNeedRefresh })` — not
// itself a component, since that callback fires whenever a new service
// worker enters the "waiting" state, entirely outside React's render
// cycle. Reuses the app's existing react-toastify setup (see main.tsx's
// own ToastContainer) rather than a second notification system.
//
// The one hard rule this exists to enforce: never let an update take
// effect while the FlareGPT chat WebSocket has an active stream in
// flight. `applyUpdate` calls into the waiting service worker's
// `skipWaiting` — if that happens mid-answer, the page reloads out from
// under a response the user is still reading, killing the connection
// with no warning. The click on "Reload" is still what triggers this —
// nothing here activates an update on its own — but *when* that click's
// effect actually lands is deferred until it's genuinely safe, rather
// than assumed safe just because the user clicked.
export function promptForUpdate(applyUpdate) {
  // Set immediately before the two places that actually dismiss-and-apply
  // (right away, or once a deferred chat reply finishes) — true here means
  // "this close is us tearing the toast down on the way to applying,"
  // never "the user dismissed this." Deliberately *not* set just from
  // clicking Reload — see `cancelPendingApply` below for why that click
  // alone isn't the same thing as the update having actually been applied.
  let applying = false;
  // Holds the deferred subscription's own `unsubscribe`, but only while an
  // auto-apply is genuinely still pending on the current chat reply to
  // finish — null the rest of the time. Lets `onClose` tell "the user
  // closed this while a deferred apply was still waiting" apart from every
  // other close reason, so it can actually cancel that pending apply
  // instead of leaving it to silently fire later with no toast left to
  // explain why the page just reloaded.
  let cancelPendingApply = null;

  const dismissAndApply = () => {
    applying = true;
    toast.dismiss(TOAST_ID);
    applyUpdate();
  };

  const reload = () => {
    if (!isChatGenerating(useFlareGptStore.getState().messages)) {
      dismissAndApply();
      return;
    }

    toast.update(TOAST_ID, {
      render: i18n.t("update.waitingForReply"),
      autoClose: false,
      closeOnClick: false,
    });

    const unsubscribe = useFlareGptStore.subscribe((state) => {
      if (isChatGenerating(state.messages)) return;
      unsubscribe();
      cancelPendingApply = null;
      dismissAndApply();
    });
    cancelPendingApply = unsubscribe;
  };

  toast(<UpdateToastContent onReload={reload} />, {
    toastId: TOAST_ID,
    autoClose: false,
    closeOnClick: false,
    draggable: false,
    // Fires on every close, including our own `toast.dismiss(TOAST_ID)`
    // calls inside `dismissAndApply` above — `applying` is what tells
    // those apart from the user closing the toast themselves, whether
    // that's from the initial "available" state or the "waiting for
    // reply" one. No polling: one timer plus a one-shot pair of event
    // listeners, set only on a real dismiss, torn down for free by a page
    // reload/close if that happens first — `registerSW` re-checks the
    // waiting worker on every fresh launch anyway (workbox-window's normal
    // behavior), so this only needs to cover the same-session case.
    onClose: () => {
      if (applying) return;
      cancelPendingApply?.();
      scheduleRetry(applyUpdate);
    },
  });
}
