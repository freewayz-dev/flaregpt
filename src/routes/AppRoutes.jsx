import { Routes, Route, Navigate } from "react-router";
import { lazy, Suspense, useState, useEffect } from "react";

import GlobalSpinner from "@/components/common/GlobalSpinner";
// Deliberately a static import, not `lazy()` — Sidebar/Navbar/Footer must
// be visible immediately on every /app/* navigation, never hidden behind
// the top-level `<Suspense fallback={<GlobalSpinner />}>` below (that
// fallback is the full-page logo splash, meant only for the very first
// load before *any* layout exists — see GlobalSpinner.tsx). A prior change
// made this `lazy()` specifically to keep recharts (~118KB gzip, pulled in
// transitively via FlareWidget -> ChatPane -> ChartBlock) out of the
// landing page's eager bundle — a real bundle-size concern, but the fix
// was too broad: it also lazy-loaded the entire dashboard chrome, so every
// fresh /app/* navigation (not just the landing page) briefly replaced
// Sidebar/Navbar with the full-screen logo splash before anything else
// could mount. Reverted to restore "sidebar and navbar stay visible
// immediately, only page content shows a loading state" — if the
// recharts-in-landing-bundle issue needs solving again, the correct scope
// is lazy-loading FlareWidget (or its chart-dependent chain) specifically,
// not this entire layout.
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardSkeleton from "@/pages/Dashboard/DashboardSkeleton";
import DefiProtocolsSkeleton from "@/pages/DefiProtocols/DefiProtocolsSkeleton";
import WalletActivitySkeleton from "@/pages/WalletActivity/WalletActivitySkeleton";
import RflrVestingPageSkeleton from "@/pages/RflrVesting/RflrVestingPageSkeleton";
import FtsoRewardsPageSkeleton from "@/pages/FtsoRewards/FtsoRewardsPageSkeleton";
import LoopsPageSkeleton from "@/pages/Loops/LoopsPageSkeleton";
import GovernancePageSkeleton from "@/pages/Governance/GovernancePageSkeleton";
import LinksPageSkeleton from "@/pages/Links/LinksPageSkeleton";
import { ROUTES, APP_SEGMENTS } from "@/config/routes";


const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Terms = lazy(() => import("@/pages/Terms"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const FLRGPT = lazy(() => import("@/pages/Flrgpt"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const DefiProtocols = lazy(() => import("@/pages/DefiProtocols"));
const Loops = lazy(() => import("@/pages/Loops"));
const RflrVesting = lazy(() => import("@/pages/RflrVesting"));
const FtsoRewards = lazy(() => import("@/pages/FtsoRewards"));
const WalletActivity = lazy(() => import("@/pages/WalletActivity"));
const Donate = lazy(() => import("@/pages/Donate"));
const Governance = lazy(() => import("@/pages/Governance"));
const Links = lazy(() => import("@/pages/Links"));

const LANDING_PAGE_PATHS = {
  "flare-gpt": ROUTES.flareGpt,
  wallet: ROUTES.walletActivity,
  rewards: ROUTES.ftsoRewards,
  rflr: ROUTES.rflrTracker,
  defi: ROUTES.defiProtocols,
};

// Module-level, not component state: it needs to survive exactly once per
// real page load and then get out of the way — not fire again every time
// in-app navigation (e.g. clicking "Overview" in the sidebar, which is
// this same /app index route) brings the user back here. A stored
// "flare-gpt" default redirecting on *every* visit to this route would
// make Overview permanently unreachable via the sidebar, since both are
// literally the same URL. Resets naturally on a full reload/new tab
// (the module re-evaluates), which is exactly what "default landing page"
// should mean — where you land fresh, not where every click on Overview
// secretly goes.
let hasAppliedLandingRedirect = false;

// Deliberately not `useUIStore(...)` here — zustand's `persist` middleware
// defers hydration to a microtask even for synchronous storage like
// localStorage, so the store's *first* render always sees its in-code
// default ("overview"), not whatever was actually saved. Reading localStorage
// directly sidesteps that: it's synchronously correct on the very first
// render, no microtask delay to race against.
function readPersistedLandingPage() {
  try {
    const raw = localStorage.getItem("flaregpt_ui_preferences");
    return raw ? JSON.parse(raw)?.state?.defaultLandingPage : undefined;
  } catch {
    return undefined;
  }
}

function DashboardIndexRoute() {
  // The redirect decision is computed once via useState's lazy initializer
  // (read-only against the module flag) and never re-derived from the
  // mutable flag directly in the render body. That mutation is deferred to
  // an effect. This matters because React 18 StrictMode double-invokes
  // component render bodies in dev to catch impure renders — an earlier
  // version mutated `hasAppliedLandingRedirect` inline in the render body,
  // so the first invocation set the flag and returned <Navigate>, but the
  // immediate second invocation (same commit) saw the flag already true and
  // returned <Dashboard> instead, silently swallowing the redirect on every
  // load. Confirmed live: the redirect never fired under `npm run dev`.
  const [redirectPath] = useState(() => {
    if (hasAppliedLandingRedirect) return null;
    const persisted = readPersistedLandingPage();
    return (persisted && LANDING_PAGE_PATHS[persisted]) ?? null;
  });

  useEffect(() => {
    hasAppliedLandingRedirect = true;
  }, []);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<GlobalSpinner />}>
      <Routes>
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.terms} element={<Terms />} />

        <Route path={ROUTES.app} element={<DashboardLayout />}>
          <Route index element={<DashboardIndexRoute />} />
          <Route path={APP_SEGMENTS.flareGpt} element={<FLRGPT />} />
          <Route
            path={APP_SEGMENTS.walletActivity}
            element={
              <Suspense fallback={<WalletActivitySkeleton />}>
                <WalletActivity />
              </Suspense>
            }
          />
          <Route path={APP_SEGMENTS.settings} element={<Settings />} />
          <Route path={APP_SEGMENTS.help} element={<Help />} />
          <Route
            path={APP_SEGMENTS.ftsoRewards}
            element={
              <Suspense fallback={<FtsoRewardsPageSkeleton />}>
                <FtsoRewards />
              </Suspense>
            }
          />
          <Route
            path={APP_SEGMENTS.loops}
            element={
              <Suspense fallback={<LoopsPageSkeleton />}>
                <Loops />
              </Suspense>
            }
          />
          <Route
            path={APP_SEGMENTS.rflrTracker}
            element={
              <Suspense fallback={<RflrVestingPageSkeleton />}>
                <RflrVesting />
              </Suspense>
            }
          />
          <Route
            path={APP_SEGMENTS.defiProtocols}
            element={
              <Suspense fallback={<DefiProtocolsSkeleton />}>
                <DefiProtocols />
              </Suspense>
            }
          />
          <Route
            path={APP_SEGMENTS.governance}
            element={
              <Suspense fallback={<GovernancePageSkeleton />}>
                <Governance />
              </Suspense>
            }
          />
          <Route path={APP_SEGMENTS.donate} element={<Donate />} />
          <Route
            path={APP_SEGMENTS.links}
            element={
              <Suspense fallback={<LinksPageSkeleton />}>
                <Links />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>
    </Suspense>
  );
}
