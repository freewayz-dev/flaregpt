import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiIcon } from "@heroicons/react/24/outline";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// TanStack Query's default onlineManager already listens for these same
// `online`/`offline` window events and auto-resumes every paused query the
// instant connectivity returns — this banner isn't what makes recovery
// happen, it's the visible signal that was missing. Without it, "you're
// offline" looked identical to "every card on the page silently failed",
// which is exactly the ambiguity this review was raised to fix.
export default function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;
    setJustReconnected(true);
    const timer = setTimeout(() => setJustReconnected(false), 3000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
        <WifiIcon className="h-3.5 w-3.5 shrink-0" />
        {t("offline.message")}
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div className="flex shrink-0 items-center justify-center gap-2 bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <WifiIcon className="h-3.5 w-3.5 shrink-0" />
        {t("offline.backOnline")}
      </div>
    );
  }

  return null;
}
