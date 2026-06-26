import { Outlet } from "react-router-dom";
import { Suspense, useState } from "react";

import Sidebar from "../common/Sidebar";
import Navbar from "../common/Navbar";
import FlareWidget from "../common/FlareWidget";

export default function DashboardLayout() {
  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);
  
  // 1. Lift the collapse state up from Sidebar (safely pulling from localStorage on initial build)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  // 2. Add mobile sidebar drawer state drawer handle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F0F4F9] dark:bg-[#09090b]">
      {/* 3. Pass values down to your Sidebar control nodes */}
      <Sidebar 
        collapsed={isSidebarCollapsed} 
        setCollapsed={setIsSidebarCollapsed}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 4. Supply Navbar with layout metrics */}
        <Navbar
          flareWidgetOpen={flareWidgetOpen}
          setFlareWidgetOpen={setFlareWidgetOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-4">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>

        <FlareWidget
          open={flareWidgetOpen}
          onClose={() => setFlareWidgetOpen(false)}
        />
      </div>
    </div>
  );
}