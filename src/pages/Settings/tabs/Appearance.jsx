import { useTranslation } from "react-i18next";
import { PaintBrushIcon } from "@heroicons/react/24/outline";

import ThemeToggle from "@/components/common/ThemeToggle";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

export default function Appearance() {
  const { t } = useTranslation();

  return (
    <Card title={t("settings.tabs.Appearance")} subtitle={t("settings.subtitles.Appearance")}>
      <div className="divide-y divide-divider">
        <RowItem
          icon={PaintBrushIcon}
          title={t("settings.cards.theme")}
          description={t("settings.descriptions.theme")}
        >
          <ThemeToggle />
        </RowItem>
      </div>
    </Card>
  );
}
