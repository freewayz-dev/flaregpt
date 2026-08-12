import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { CircleStackIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

import { useFlareGptStore } from "@/store/useFlareGptStore";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useAuthStore } from "@/store/useAuthStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import * as chatService from "@/services/chatService";
import { queryKeys } from "@/services/queryKeys";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

const CONFIRM_WINDOW_MS = 3000;





function ClearButton({
  armed,
  onClick,
  label,
  confirmLabel,
  busy,
  busyLabel,
  disabled,
  disabledTitle,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      title={disabled ? disabledTitle : undefined}
      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        armed
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-surface-inset text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary"
      }`}
    >
      {busy ? busyLabel : armed ? confirmLabel : label}
    </button>
  );
}

// Two tiers, not one — "clearing my cache" and "clearing what my account
// holds on the backend" are very different stakes, and conflating them
// under one generic "Data" bucket would hide that difference. Local Data
// is everything this browser holds regardless of sign-in state (currently
// just the Wallet Activity query cache) and is safe to clear instantly.
// FlareGPT's chat history moved here from Local Data once it became the
// first real backend-synced data this app has — clearing it now actually
// deletes it from the account, not just this browser.
export default function DataStorage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const clearMessages = useFlareGptStore((s) => s.clearMessages);
  const { hasSession } = useAuthStatus();
  const authenticatedAddress = useAuthStore((state) => state.authenticatedAddress);
  // Clearing the wallet-activity query cache is purely local (no network
  // at all) and stays available offline; clearing synced conversations
  // calls chatService.clearAllConversations — one of sw.ts's explicit
  // NetworkOnly routes — so only that one button needs gating.
  const isOnline = useOnlineStatus();

  const [armed, setArmed] = useState(null);
  const [clearingKey, setClearingKey] = useState(null);
  const [armAnnouncement, setArmAnnouncement] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current ?? undefined), []);

  // Same reasoning as Wallets.jsx's remove-confirm announcer: only the arm
  // transition gets announced. The disarm transition is ambiguous between
  // "timed out / cancelled" and "confirmed and now clearing" from this
  // state alone, and guessing wrong is worse than staying silent there.
  const arm = (key, itemLabel) => {
    clearTimeout(timerRef.current ?? undefined);
    setArmed(key);
    setArmAnnouncement(t("settings.dataStorage.clearArmed", { item: itemLabel }));
    timerRef.current = setTimeout(() => setArmed(null), CONFIRM_WINDOW_MS);
  };

  // `clearingKey` guards re-entry for the async (backend-hitting) actions —
  // without it, tapping "Confirm?" disarmed the button immediately even
  // though `clearConversations` below is still an in-flight multi-request
  // operation, so a second tap during that window could kick off a second
  // concurrent clear rather than being a no-op.
  const handleClick = (key, itemLabel, action) => {
    if (clearingKey) return;
    if (armed === key) {
      clearTimeout(timerRef.current ?? undefined);
      setArmed(null);
      const result = action();
      if (result instanceof Promise) {
        setClearingKey(key);
        result.finally(() => setClearingKey(null));
      }
      return;
    }
    arm(key, itemLabel);
  };

  // The backend holds every conversation per account (no local-only guest
  // state left to fall back on), so this now has to succeed against the
  // real endpoint before local state is cleared — clearing local state on
  // a failed request would just have the old conversations reappear the
  // next time the switcher (or the active thread) is fetched. Deletes
  // *every* conversation at once (confirmed live: the same endpoint that
  // used to clear the old flat history still wipes the new per-conversation
  // model too) rather than looping a DELETE per conversation.
  const clearConversations = async () => {
    try {
      await chatService.clearAllConversations();
      clearMessages();
      useFlareGptStore.getState().setActiveConversationId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations(authenticatedAddress) });
      toast.success(t("settings.dataStorage.conversationsCleared"));
    } catch {
      toast.error(t("settings.dataStorage.conversationsClearFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="sr-only">
        {armAnnouncement}
      </div>
      <Card title={t("settings.dataStorage.localTitle")} subtitle={t("settings.dataStorage.localSubtitle")}>
        <div className="divide-y divide-divider">
          <RowItem
            icon={CircleStackIcon}
            title={t("settings.dataStorage.walletCache")}
            description={t("settings.dataStorage.walletCacheDescription")}
          >
            <ClearButton
              armed={armed === "wallet"}
              onClick={() =>
                handleClick("wallet", t("settings.dataStorage.walletCache"), () => {
                  queryClient.removeQueries({ queryKey: queryKeys.walletActivity.all });
                  toast.success(t("settings.dataStorage.walletCacheCleared"));
                })
              }
              label={t("settings.dataStorage.clear")}
              confirmLabel={t("settings.dataStorage.confirmClear")}
            />
          </RowItem>
        </div>
      </Card>

      {/* Nothing here applies to a guest — a guest's chat is one ephemeral,
          never-persisted, client-only thread (see useFlareGptConversation.js),
          not an account-backed conversation list this endpoint could ever
          act on. Clicking Clear used to reach `clearAllConversations`
          anyway, which calls `fetchConversations` — a session-only endpoint
          that 401s for a guest, so this always failed rather than clearing
          anything. Hiding the whole card (not just disabling the button)
          since its subtitle and description only make sense once signed in. */}
      {hasSession && (
        <Card title={t("settings.dataStorage.accountTitle")} subtitle={t("settings.dataStorage.accountSubtitle")}>
          <div className="divide-y divide-divider">
            <RowItem
              icon={ChatBubbleLeftRightIcon}
              title={t("settings.dataStorage.conversations")}
              description={t("settings.dataStorage.conversationsDescription")}
            >
              <ClearButton
                armed={armed === "conversations"}
                busy={clearingKey === "conversations"}
                busyLabel={t("settings.dataStorage.clearing")}
                onClick={() =>
                  handleClick("conversations", t("settings.dataStorage.conversations"), clearConversations)
                }
                label={t("settings.dataStorage.clear")}
                confirmLabel={t("settings.dataStorage.confirmClear")}
                disabled={!isOnline}
                disabledTitle={t("settings.dataStorage.offline")}
              />
            </RowItem>
          </div>
        </Card>
      )}
    </div>
  );
}
