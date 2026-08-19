import { toast } from "react-toastify";

import { useFlareGptStore, isChatGenerating } from "@/store/useFlareGptStore";
import { UpdateToastContent } from "@/components/common/UpdateToastContent";
import i18n from "@/i18n";

const TOAST_ID = "pwa-update-available";

// Called once, from main.tsx's `registerSW({ onNeedRefresh })` — not
// itself a component, since that callback fires whenever a new service
// worker enters the "waiting" state, entirely outside React's render
// cycle. Reuses the app's existing react-toastify setup (see main.tsx's
// own ToastContainer) rather than a second notification system.
//
// Deliberately not dismissible: no close button, `closeOnClick: false`,
// `draggable: false`, `autoClose: false` — the whole point is "you're one
// reload away from code that's already downloaded and waiting," and a tab
// left running stale code indefinitely because this got swiped away once
// is exactly the failure this is meant to prevent. The only way this
// toast ever goes away is `dismissAndApply` below, i.e. Reload was
// actually clicked and the update actually applied.
//
// The one hard rule this exists to enforce beyond that: never let an
// update take effect while the FlareGPT chat WebSocket has an active
// stream in flight. `applyUpdate` calls into the waiting service worker's
// `skipWaiting` — if that happens mid-answer, the page reloads out from
// under a response the user is still reading, killing the connection
// with no warning. The click on "Reload" is still what triggers this —
// nothing here activates an update on its own — but *when* that click's
// effect actually lands is deferred until it's genuinely safe, rather
// than assumed safe just because the user clicked.
export function promptForUpdate(applyUpdate) {
  const dismissAndApply = () => {
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
    });

    const unsubscribe = useFlareGptStore.subscribe((state) => {
      if (isChatGenerating(state.messages)) return;
      unsubscribe();
      dismissAndApply();
    });
  };

  toast(<UpdateToastContent onReload={reload} />, {
    toastId: TOAST_ID,
    autoClose: false,
    closeOnClick: false,
    draggable: false,
    closeButton: false,
  });
}
