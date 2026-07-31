import { useTranslation } from "react-i18next";

import { useUIStore } from "@/store/useUIStore";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";
import Toggle from "@/pages/Settings/components/Toggle";

export default function Accessibility() {
  const { t } = useTranslation();
  const reduceMotionOverride = useUIStore((state) => state.reduceMotionOverride);
  const setReduceMotionOverride = useUIStore((state) => state.setReduceMotionOverride);

  return (
    <Card title={t("settings.tabs.Accessibility")} subtitle={t("settings.subtitles.Accessibility")}>
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.reduceMotion")}
          description={t("settings.descriptions.reduceMotion")}
        >
          <Toggle
            checked={reduceMotionOverride}
            onChange={setReduceMotionOverride}
            label={t("settings.cards.reduceMotion")}
          />
        </RowItem>
      </div>
    </Card>
  );
}
