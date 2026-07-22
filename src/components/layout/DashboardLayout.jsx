import { Outlet } from "react-router-dom";
import { Suspense, useState } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FlareWidget from "@/components/common/FlareWidget";
import { useAuthSync } from "@/hooks/useAuthSync";

// GlobalSpinner is h-screen, which is correct for AppRoutes' top-level
// fallback (rendered before any layout exists) but would briefly exceed
// main's actual available height here, popping main's own scrollbar in and
// out on every route change. This fallback just centers within whatever
// space it's given instead.
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
    </div>
  );
}

export default function DashboardLayout() {
  // Connecting a wallet anywhere in the app shell doubles as signing in.
  useAuthSync();

  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-[#F0F4F9] dark:bg-[#101115]">
      <div className="relative flex h-full mx-auto max-w-[1440px] transform-gpu">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Navbar
            flareWidgetOpen={flareWidgetOpen}
            setFlareWidgetOpen={setFlareWidgetOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="flex min-h-full flex-col md:p-6 p-4">
              <div className="flex-1">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Outlet />
                </Suspense>
              </div>

              <Footer />
            </div>
          </main>

          <FlareWidget
            open={flareWidgetOpen}
            onClose={() => setFlareWidgetOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
