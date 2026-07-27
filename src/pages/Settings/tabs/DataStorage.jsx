import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CircleStackIcon, ChatBubbleLeftRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";

import { useFlareGptStore } from "@/store/useFlareGptStore";
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

// Two tiers, not one — "clearing my cache" and "deleting my account's
// synced data" are very different stakes, and conflating them under one
// generic "Data" bucket would hide that difference. Local Data is
// everything this browser holds regardless of sign-in state (the
// Wallet Activity query cache, UI preferences, and — until backend sync
// ships — every FlareGPT conversation, guest or not) and is safe to clear
// instantly. Account Data is reserved for what the backend will hold once
// it exists; shown as a locked placeholder rather than hidden entirely, so
// the roadmap is visible without pretending it's already usable.
export default function DataStorage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const clearAllConversations = useFlareGptStore((s) => s.clearAllConversations);

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

          <RowItem
            icon={ChatBubbleLeftRightIcon}
            title={t("settings.dataStorage.conversations")}
            description={t("settings.dataStorage.conversationsDescription")}
          >
            <ClearButton
              armed={armed === "conversations"}
              onClick={() => handleClick("conversations", clearAllConversations)}
              label={t("settings.dataStorage.clear")}
              confirmLabel={t("settings.dataStorage.confirmClear")}
            />
          </RowItem>
        </div>
      </Card>

      <Card title={t("settings.dataStorage.accountTitle")} subtitle={t("settings.dataStorage.accountSubtitle")}>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-inset px-4 py-6 text-center justify-center flex-col">
          <LockClosedIcon className="h-6 w-6 text-ink-muted" />
          <p className="text-sm font-medium text-ink-primary">{t("settings.dataStorage.accountUnavailable")}</p>
          <p className="text-xs text-ink-muted max-w-sm">{t("settings.dataStorage.accountUnavailableDescription")}</p>
        </div>
      </Card>
    </div>
  );
}
