import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { lazy } from "react";

const LandingPage = lazy(() => import("../pages/LandingPage"));

const Dashboard = lazy(() => import("../pages/Dashboard"));
const FLRGPT = lazy(() => import("../pages/Flrgpt"));
const WalletActivity = lazy(() => import("../pages/WalletActivity"));
const Settings = lazy(() => import("../pages/Settings"));
const Help = lazy(() => import("../pages/Help"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="flrgpt" element={<FLRGPT />} />
        <Route path="wallet" element={<WalletActivity />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
