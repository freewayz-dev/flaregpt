import { Outlet } from "react-router-dom";
import { Suspense, useState } from "react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FlareWidget from "@/components/common/FlareWidget";
import GlobalSpinner from "@/components/common/GlobalSpinner";

export default function DashboardLayout() {
  const [flareWidgetOpen, setFlareWidgetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F0F4F9] dark:bg-[#101115]">
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
