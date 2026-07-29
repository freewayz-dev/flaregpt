import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { CircleStackIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

import { useFlareGptStore } from "@/store/useFlareGptStore";
import * as chatService from "@/services/chatService";
import { queryKeys } from "@/services/queryKeys";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

const CONFIRM_WINDOW_MS = 3000;

function ClearButton({ armed, onClick, label, confirmLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50 focus-visible:outline-offset-2 ${
        armed
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-surface-inset text-ink-secondary hover:bg-surface-card-hover hover:text-ink-primary"
      }`}
    >
      {armed ? confirmLabel : label}
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

  const [armed, setArmed] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const arm = (key) => {
    clearTimeout(timerRef.current);
    setArmed(key);
    timerRef.current = setTimeout(() => setArmed(null), CONFIRM_WINDOW_MS);
  };

  const handleClick = (key, action) => {
    if (armed === key) {
      clearTimeout(timerRef.current);
      setArmed(null);
      action();
      return;
    }
    arm(key);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    } catch {
      toast.error(t("settings.dataStorage.conversationsClearFailed"));
    }
  };

  return (
    <div className="space-y-6">
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
                handleClick("wallet", () =>
                  queryClient.removeQueries({ queryKey: queryKeys.walletActivity.all }),
                )
              }
              label={t("settings.dataStorage.clear")}
              confirmLabel={t("settings.dataStorage.confirmClear")}
            />
          </RowItem>
        </div>
      </Card>

      <Card title={t("settings.dataStorage.accountTitle")} subtitle={t("settings.dataStorage.accountSubtitle")}>
        <div className="divide-y divide-divider">
          <RowItem
            icon={ChatBubbleLeftRightIcon}
            title={t("settings.dataStorage.conversations")}
            description={t("settings.dataStorage.conversationsDescription")}
          >
            <ClearButton
              armed={armed === "conversations"}
              onClick={() => handleClick("conversations", clearConversations)}
              label={t("settings.dataStorage.clear")}
              confirmLabel={t("settings.dataStorage.confirmClear")}
            />
          </RowItem>
        </div>
      </Card>
    </div>
  );
}
