import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

export default function Security() {
  const { t } = useTranslation();
  const timeoutOptions = [
    { value: "15 min", labelKey: "settings.options.15m" },
    { value: "30 min", labelKey: "settings.options.30m" },
    { value: "1 hour", labelKey: "settings.options.1h" },
    { value: "Never", labelKey: "settings.options.never" },
  ];
  const [timeout, setTimeoutState] = useState(timeoutOptions[1]);
  const formatOptions = (opts) =>
    opts.map((o) => ({ ...o, label: t(o.labelKey) }));

  return (
    <Card
      title={t("settings.tabs.Security")}
      subtitle={t("settings.subtitles.Security")}
    >
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#262A30]">
        <RowItem
          title={t("settings.cards.sessionTimeout")}
          description={t("settings.descriptions.sessionTimeout")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(timeoutOptions)}
              selectedValue={{ ...timeout, label: t(timeout.labelKey) }}
              onChange={setTimeoutState}
            />
          </div>
        </RowItem>
        <RowItem
          title={t("settings.cards.logout")}
          description={t("settings.descriptions.logout")}
        >
          <button className="flex items-center gap-2 justify-center w-full sm:w-auto rounded-xl bg-surface-subtle dark:bg-[#121214] px-4 py-2 text-sm font-medium text-ink-primary hover:bg-[#E5E7EB] transition duration-150 cursor-pointer select-none">
            <ArrowRightOnRectangleIcon className="h-4 w-4 text-ink-muted" />
            <span>{t("settings.security.logoutAll")}</span>
          </button>
        </RowItem>
      </div>
    </Card>
  );
}
