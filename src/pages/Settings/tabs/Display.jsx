import { useState } from "react";
import { useTranslation } from "react-i18next";

import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

export default function Display() {
  const { t } = useTranslation();

  const chartOptions = [
    { value: "Line", labelKey: "settings.options.line" },
    { value: "Candlestick", labelKey: "settings.options.candlestick" },
    { value: "Area", labelKey: "settings.options.area" },
  ];

  const timeframeOptions = [
    { value: "1D", labelKey: "1D" },
    { value: "7D", labelKey: "7D" },
    { value: "30D", labelKey: "30D" },
    { value: "1Y", labelKey: "1Y" },
  ];

  const [chart, setChart] = useState(chartOptions[0]);
  const [timeframe, setTimeframe] = useState(timeframeOptions[0]);

  const formatOptions = (opts) =>
    opts.map((o) => ({
      ...o,
      label: o.labelKey.includes(".") ? t(o.labelKey) : o.labelKey,
    }));

  return (
    <Card
      title={t("settings.tabs.Display")}
      subtitle={t("settings.subtitles.Display")}
    >
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#262A30]">
        <RowItem
          title={t("settings.cards.chartType")}
          description={t("settings.descriptions.chartType")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(chartOptions)}
              selectedValue={{ ...chart, label: t(chart.labelKey) }}
              onChange={setChart}
            />
          </div>
        </RowItem>
        <RowItem
          title={t("settings.cards.timeframe")}
          description={t("settings.descriptions.timeframe")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(timeframeOptions)}
              selectedValue={{ ...timeframe, label: timeframe.labelKey }}
              onChange={setTimeframe}
            />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
