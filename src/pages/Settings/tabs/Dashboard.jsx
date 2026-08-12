import { useTranslation } from "react-i18next";

import {
  useUIStore} from "@/store/useUIStore";
import CustomSelect from "@/components/common/CustomSelect";
import Card from "@/pages/Settings/components/Card";
import RowItem from "@/pages/Settings/components/RowItem";
import Toggle from "@/pages/Settings/components/Toggle";

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

// Landing-page values match the route paths AppRoutes.jsx's index-route
// redirect reads directly (see LANDING_PAGE_PATHS there) — kept as plain
// strings rather than an imported shared constant since this is the only
// other place that needs the list, and duplicating short strings costs
// less than a cross-file dependency for it.
const landingPageOptions = [
  { value: "overview", labelKey: "sidebar.overview" },
  { value: "flare-gpt", labelKey: "sidebar.FlareGPT" },
  { value: "wallet", labelKey: "sidebar.walletActivity" },
  { value: "rewards", labelKey: "sidebar.ftsoRewards" },
  { value: "rflr", labelKey: "sidebar.rflrTracker" },
  { value: "defi", labelKey: "sidebar.defiProtocols" },
];

const densityOptions = [
  { value: "comfortable", labelKey: "settings.options.comfortable" },
  { value: "compact", labelKey: "settings.options.compact" },
];

export default function Dashboard() {
  const { t } = useTranslation();

  const chartType = useUIStore((state) => state.chartType);
  const setChartType = useUIStore((state) => state.setChartType);
  const timeframe = useUIStore((state) => state.timeframe);
  const setTimeframe = useUIStore((state) => state.setTimeframe);
  const defaultLandingPage = useUIStore((state) => state.defaultLandingPage);
  const setDefaultLandingPage = useUIStore((state) => state.setDefaultLandingPage);
  const tableDensity = useUIStore((state) => state.tableDensity);
  const setTableDensity = useUIStore((state) => state.setTableDensity);
  const hideBalances = useUIStore((state) => state.hideBalances);
  const toggleHideBalances = useUIStore((state) => state.toggleHideBalances);

  const currentChart = chartOptions.find((o) => o.value === chartType) || chartOptions[0];
  const currentTimeframe = timeframeOptions.find((o) => o.value === timeframe) || timeframeOptions[1];
  const currentLandingPage =
    landingPageOptions.find((o) => o.value === defaultLandingPage) || landingPageOptions[0];
  const currentDensity = densityOptions.find((o) => o.value === tableDensity) || densityOptions[0];

  return (
    <Card title={t("settings.tabs.Display")} subtitle={t("settings.subtitles.Display")}>
      <div className="divide-y divide-divider">
        <RowItem
          title={t("settings.cards.defaultLandingPage")}
          description={t("settings.descriptions.defaultLandingPage")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={landingPageOptions}
              selectedValue={currentLandingPage}
              onChange={(option) => setDefaultLandingPage(option.value)}
              aria-label={t("settings.cards.defaultLandingPage")}
            />
          </div>
        </RowItem>

        <RowItem
          title={t("settings.cards.tableDensity")}
          description={t("settings.descriptions.tableDensity")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={densityOptions}
              selectedValue={currentDensity}
              onChange={(option) => setTableDensity(option.value)}
              aria-label={t("settings.cards.tableDensity")}
            />
          </div>
        </RowItem>

        <RowItem
          title={t("settings.cards.hideBalances")}
          description={t("settings.descriptions.hideBalances")}
        >
          <Toggle
            checked={hideBalances}
            onChange={toggleHideBalances}
            label={t("settings.cards.hideBalances")}
          />
        </RowItem>

        <RowItem
          title={t("settings.cards.chartType")}
          description={t("settings.descriptions.chartType")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={chartOptions}
              selectedValue={currentChart}
              onChange={(option) => setChartType(option.value)}
              aria-label={t("settings.cards.chartType")}
            />
          </div>
        </RowItem>
        <RowItem
          title={t("settings.cards.timeframe")}
          description={t("settings.descriptions.timeframe")}
        >
          <div className="w-full sm:w-56">
            <CustomSelect
              options={timeframeOptions}
              selectedValue={currentTimeframe}
              aria-label={t("settings.cards.timeframe")}
              onChange={(option) => setTimeframe(option.value)}
            />
          </div>
        </RowItem>
      </div>
    </Card>
  );
}
