import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GlobalSpinner from "@/components/common/GlobalSpinner";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Terms = lazy(() => import("@/pages/Terms"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FLRGPT = lazy(() => import("@/pages/Flrgpt"));
const WalletActivity = lazy(() => import("@/pages/WalletActivity"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));

export default function AppRoutes() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<GlobalSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="flare-gpt" element={<FLRGPT />} />
          <Route path="wallet" element={<WalletActivity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route
            path="rewards"
            element={<ComingSoon title={t("sidebar.ftsoRewards")} />}
          />
          <Route
            path="loops"
            element={<ComingSoon title={t("sidebar.loops")} />}
          />
          <Route
            path="rflr"
            element={<ComingSoon title={t("sidebar.rflrTracker")} />}
          />
          <Route
            path="fxrp"
            element={<ComingSoon title={t("sidebar.fxrpPool")} />}
          />
          <Route
            path="governance"
            element={<ComingSoon title={t("sidebar.governance")} />}
          />
          <Route
            path="donate"
            element={<ComingSoon title={t("footer.donate")} />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
