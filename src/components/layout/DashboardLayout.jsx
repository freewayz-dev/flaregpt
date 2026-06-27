import { Outlet } from "react-router-dom";
import { Suspense, useState } from "react";

import Sidebar from "../common/Sidebar";
import Navbar from "../common/Navbar";
import FlareWidget from "../common/FlareWidget";
import Footer from "../common/Footer";

export default function DashboardLayout() {
  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="flex flex-1 flex-col min-h-0">
        <Navbar
          flareWidgetOpen={flareWidgetOpen}
          setFlareWidgetOpen={setFlareWidgetOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Everything below the navbar scrolls */}
        <main className="flex-1 overflow-y-auto bg-[#F0F4F9] dark:bg-[#09090b]">
          <div className="flex min-h-full flex-col p-4">
            {/* Page */}
            <div className="flex-1">
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </div>

            {/* Shared footer */}
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
