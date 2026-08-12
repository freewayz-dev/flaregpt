import { useState } from "react";
import { useTranslation } from "react-i18next";

import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";
import { usePwaInstallStore } from "@/store/usePwaInstallStore";
import { isIOSDevice } from "@/utils/platform";

// The permanent, always-discoverable install entry point — deliberately
// separate from InstallAppBanner.tsx's one-time, dismissible nudge. Once
// someone dismisses that banner (or it never had a reason to show, e.g.
// they're not on a page it renders on yet), this is the one place install
// is still reachable, matching how Linear/Notion keep "Install app"
// sitting quietly in a settings/menu surface rather than only ever
// popping up unprompted.
function InstallAppRow() {
  const { t } = useTranslation();
  const deferredPrompt = usePwaInstallStore((state) => state.deferredPrompt);
  const isInstalled = usePwaInstallStore((state) => state.isInstalled);
  const promptInstall = usePwaInstallStore((state) => state.promptInstall);
  const [installing, setInstalling] = useState(false);
  const isIOS = isIOSDevice();
  const canInstall = Boolean(deferredPrompt);

  // Nothing actionable to show at all (desktop Firefox, desktop Safari,
  // ...) — same gating as InstallAppBanner.tsx, for the same reason: no
  // real next step exists to offer there.
  if (!isInstalled && !canInstall && !isIOS) return null;

  const description = isInstalled
    ? t("settings.install.descriptionInstalled")
    : isIOS
      ? t("settings.install.descriptionIOS")
      : t("settings.install.descriptionAvailable");

  return (
    <RowItem title={t("settings.install.title")} description={description}>
      {isInstalled ? (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
          {t("settings.install.installedBadge")}
        </span>
      ) : (
        canInstall && (
          <button
            type="button"
            onClick={async () => {
              setInstalling(true);
              await promptInstall();
              setInstalling(false);
            }}
            disabled={installing}
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {installing ? t("install.installing") : t("settings.install.button")}
          </button>
        )
      )}
    </RowItem>
  );
}

export default function About() {
  const { t } = useTranslation();
  return (
    <Card
      title={t("settings.tabs.About")}
      subtitle={t("settings.subtitles.About")}
    >
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.app")}
          description={t("settings.descriptions.app")}
        >
          <span className="text-sm font-mono bg-surface-subtle px-2.5 py-1 rounded-lg text-ink-secondary">
            v1.0.0
          </span>
        </RowItem>
        <InstallAppRow />
        <RowItem
          title={t("settings.cards.links")}
          description={t("settings.descriptions.links")}
        >
          <div className="flex gap-4 text-sm text-brand font-medium select-none">
            <a className="hover:text-brand-hover cursor-pointer transition-colors duration-150">
              {t("settings.links.twitter")}
            </a>
            <span className="text-line">•</span>
            <a className="hover:text-brand-hover cursor-pointer transition-colors duration-150">
              {t("settings.links.docs")}
            </a>
            <span className="text-line">•</span>
            <a className="hover:text-brand-hover cursor-pointer transition-colors duration-150">
              {t("settings.links.github")}
            </a>
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
