import { useTranslation } from "react-i18next";

import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";
import Toggle from "@/pages/Settings/components/Toggle";

export default function Notifications() {
  const { t } = useTranslation();
  return (
    <Card
      title={t("settings.tabs.Notifications")}
      subtitle={t("settings.subtitles.Notifications")}
    >
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.rewardsAlerts")}
          description={t("settings.notifications.rewards")}
        >
          <Toggle />
        </RowItem>
        <RowItem
          title={t("settings.cards.governanceAlerts")}
          description={t("settings.notifications.governance")}
        >
          <Toggle />
        </RowItem>
      </div>
    </Card>
  );
}
