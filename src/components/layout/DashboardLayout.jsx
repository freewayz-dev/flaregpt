import { Outlet } from "react-router-dom";
import { Suspense, useState } from "react";

import Sidebar from "../common/Sidebar";
import Navbar from "../common/Navbar";
import FlareWidget from "../common/FlareWidget";
import Footer from "../common/Footer";
import GlobalSpinner from "../common/GlobalSpinner";

export default function DashboardLayout() {
  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F0F4F9] dark:bg-[#09090b]">
      <Sidebar
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar
          flareWidgetOpen={flareWidgetOpen}
          setFlareWidgetOpen={setFlareWidgetOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col md:p-4 p-5">
            <div className="flex-1">
              <Suspense fallback={<GlobalSpinner />}>
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
  );
}
