import { useTranslation } from "react-i18next";

import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

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
