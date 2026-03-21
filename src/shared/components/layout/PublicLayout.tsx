import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "@/shared/components/layout/SiteHeader";
import { SiteFooter } from "@/shared/components/layout/SiteFooter";
import { BottomNav } from "@/shared/components/layout/BottomNav";

const PublicLayout = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isHome && <SiteHeader />}
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
};

export default PublicLayout;
