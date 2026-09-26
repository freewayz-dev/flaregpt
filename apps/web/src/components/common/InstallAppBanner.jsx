import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { usePwaInstallStore } from "@/store/usePwaInstallStore";
import { isIOSDevice } from "@/utils/platform";

// A soft delay, not an instant pop the moment the dashboard mounts —
// "avoid intrusive install reminders" from the roadmap. Long enough that
// it reads as a considered suggestion once someone's actually looking at
// the dashboard, short enough it doesn't feel like it's hiding.
const APPEARANCE_DELAY_MS = 4000;

export default function InstallAppBanner() {
  const { t } = useTranslation();
  const deferredPrompt = usePwaInstallStore((state) => state.deferredPrompt);
  const isInstalled = usePwaInstallStore((state) => state.isInstalled);
  const dismissedAt = usePwaInstallStore((state) => state.installBannerDismissedAt);
  const dismissInstallBanner = usePwaInstallStore((state) => state.dismissInstallBanner);
  const registerInstallBannerVisit = usePwaInstallStore((state) => state.registerInstallBannerVisit);
  const promptInstall = usePwaInstallStore((state) => state.promptInstall);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Counts this app launch toward the current snooze — a no-op unless the
  // banner was actually dismissed before. Once per mount (a "visit"), not
  // once per render.
  useEffect(() => {
    registerInstallBannerVisit();
  }, [registerInstallBannerVisit]);

  const canInstall = Boolean(deferredPrompt);
  const isIOS = isIOSDevice();
  // Nothing actionable to offer elsewhere (desktop Firefox, desktop
  // Safari, ...) — those browsers have no `beforeinstallprompt` and no
  // instructable manual flow either, so showing a banner with no real next
  // step would just be noise, not a suggestion.
  const eligible = !isInstalled && dismissedAt === null && (canInstall || isIOS);

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), APPEARANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  if (!eligible || !visible) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  return (
    <div className="flex shrink-0 items-center justify-center gap-3 bg-brand/10 px-4 py-2 text-xs font-medium text-brand-text">
      <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
      <span>{isIOS ? t("install.bannerDescriptionIOS") : t("install.bannerDescriptionAndroid")}</span>
      {canInstall && (
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="shrink-0 rounded-lg bg-brand px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {installing ? t("install.installing") : t("install.installButton")}
        </button>
      )}
      <button
        type="button"
        onClick={dismissInstallBanner}
        aria-label={t("install.dismiss")}
        // The visible icon stays small (14px) so it doesn't unbalance this
        // slim banner strip, but the real tap target is expanded to
        // ~40x40 via an invisible pseudo-element — same trick as
        // Toggle.tsx's own track, for the same reason: growing the
        // *visible* button here would make the banner noticeably taller.
        className="relative shrink-0 text-brand/70 hover:text-brand transition-colors cursor-pointer before:content-[''] before:absolute before:-inset-3"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
