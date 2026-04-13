import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "@/shared/components/layout/SiteHeader";
import { SiteFooter } from "@/shared/components/layout/SiteFooter";
import { BottomNav } from "@/shared/components/layout/BottomNav";
import MapsDisclosure from "@/shared/components/MapsDisclosure";
import { PaymentStatusBanner } from "@/features/agents/components/PaymentStatusBanner";

const PublicLayout = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const searchParams = new URLSearchParams(location.search);
  const hasSearch = isHome && !!searchParams.get('location');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <PaymentStatusBanner />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!hasSearch && <MapsDisclosure />}
      {!hasSearch && <SiteFooter />}
      <BottomNav />
    </div>
  );
};

export default PublicLayout;
