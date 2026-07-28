import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightOnRectangleIcon, CheckIcon } from "@heroicons/react/24/outline";

import { logout } from "@/hooks/useAuthSync";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

// Same inline arm-then-confirm pattern as removing a watchlist wallet and
// clearing local data elsewhere in Settings — logging out is consequential
// enough to want a confirm step, but a full modal is more ceremony than a
// single click deserves.
const CONFIRM_WINDOW_MS = 3000;

export default function Security() {
  const { t } = useTranslation();
  const { hasSession } = useAuthStatus();

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const confirmTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  // Logout has nothing to do once there's no session left — without this,
  // a signed-out user could keep pressing it (and re-arming the confirm
  // state) with no session for it to act on.
  useEffect(() => {
    if (!hasSession) {
      clearTimeout(confirmTimerRef.current);
      setConfirmingLogout(false);
    }
  }, [hasSession]);

  const handleLogoutClick = () => {
    if (!hasSession) return;
    if (confirmingLogout) {
      clearTimeout(confirmTimerRef.current);
      setConfirmingLogout(false);
      logout();
      return;
    }
    setConfirmingLogout(true);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirmingLogout(false), CONFIRM_WINDOW_MS);
  };

  return (
    <Card
      title={t("settings.tabs.Security")}
      subtitle={t("settings.subtitles.Security")}
    >
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.logout")}
          description={t("settings.descriptions.logout")}
        >
          <button
            type="button"
            onClick={handleLogoutClick}
            disabled={!hasSession}
            className={`flex items-center gap-2 justify-center w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-medium transition duration-150 select-none ${
              !hasSession
                ? "bg-surface-subtle dark:bg-[#121214] text-ink-muted opacity-50 cursor-not-allowed"
                : confirmingLogout
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer"
                  : "bg-surface-subtle dark:bg-[#121214] text-ink-primary hover:bg-[#E5E7EB] dark:hover:bg-surface-card-hover cursor-pointer"
            }`}
          >
            {confirmingLogout && hasSession ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <ArrowRightOnRectangleIcon className="h-4 w-4 text-ink-muted" />
            )}
            <span>
              {confirmingLogout && hasSession
                ? t("settings.security.confirmLogout")
                : t("settings.security.logout")}
            </span>
          </button>
        </RowItem>
      </div>
    </Card>
  );
}
