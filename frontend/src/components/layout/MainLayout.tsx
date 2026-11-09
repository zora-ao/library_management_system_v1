import { useState } from "react";
import { useLocation } from "react-router-dom";
import PageOutlet from "./PageOutlet";
import CatalogLayout from "./CatalogLayout";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { useAuth } from "@/hooks/useAuth";

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const isStaff = user?.role === "admin" || user?.role === "librarian";

  if (
    !isStaff ||
    /^\/books(?:\/[^/]+)?\/?$/.test(pathname) ||
    /^\/(?:my-borrows|my-favorites|about)\/?$/.test(pathname)
  ) {
    return <CatalogLayout />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Top Header with Hamburger Sheet */}
      <MobileHeader />

      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className={isDashboard ? "flex-1 p-4 md:p-8" : "flex-1 p-4 md:p-6"}>
          <PageOutlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
