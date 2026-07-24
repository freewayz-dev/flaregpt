import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GlobalSpinner from "@/components/common/GlobalSpinner";
import DashboardSkeleton from "@/pages/Dashboard/DashboardSkeleton";
import DefiProtocolsSkeleton from "@/pages/DefiProtocols/DefiProtocolsSkeleton";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Terms = lazy(() => import("@/pages/Terms"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FLRGPT = lazy(() => import("@/pages/Flrgpt"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const DefiProtocols = lazy(() => import("@/pages/DefiProtocols"));
const Donate = lazy(() => import("@/pages/Donate"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));

export default function AppRoutes() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<GlobalSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<DashboardSkeleton />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route path="flare-gpt" element={<FLRGPT />} />
          <Route
            path="wallet"
            element={<ComingSoon title={t("sidebar.walletActivity")} />}
          />
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
            element={
              <Suspense fallback={<DefiProtocolsSkeleton />}>
                <DefiProtocols />
              </Suspense>
            }
          />
          <Route
            path="governance"
            element={<ComingSoon title={t("sidebar.governance")} />}
          />
          <Route path="donate" element={<Donate />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
