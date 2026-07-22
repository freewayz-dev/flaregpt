import { useTranslation } from "react-i18next";

import { useUIStore } from "@/store/useUIStore";
import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";

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

export default function Display() {
  const { t } = useTranslation();

  const chartType = useUIStore((state) => state.chartType);
  const setChartType = useUIStore((state) => state.setChartType);
  const timeframe = useUIStore((state) => state.timeframe);
  const setTimeframe = useUIStore((state) => state.setTimeframe);

  const currentChart =
    chartOptions.find((o) => o.value === chartType) || chartOptions[0];
  const currentTimeframe =
    timeframeOptions.find((o) => o.value === timeframe) || timeframeOptions[1];

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
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.chartType")}
          description={t("settings.descriptions.chartType")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={formatOptions(chartOptions)}
              selectedValue={{ ...currentChart, label: t(currentChart.labelKey) }}
              onChange={(option) => setChartType(option.value)}
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
              selectedValue={{
                ...currentTimeframe,
                label: currentTimeframe.labelKey,
              }}
              onChange={(option) => setTimeframe(option.value)}
            />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
