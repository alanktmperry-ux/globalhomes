import { Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "@/shared/components/layout/SiteHeader";
import { SiteFooter } from "@/shared/components/layout/SiteFooter";
import { BottomNav } from "@/shared/components/layout/BottomNav";
import MapsDisclosure from "@/shared/components/MapsDisclosure";
import SupportWidget from "@/features/support/components/SupportWidget";
// PaymentStatusBanner only renders for signed-in agents with a payment issue —
// lazy so the feature-agents chunk stays out of the cold-paint critical path.
const PaymentStatusBanner = lazy(() =>
  import("@/features/agents/components/PaymentStatusBanner").then(m => ({ default: m.PaymentStatusBanner }))
);

const PublicLayout = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const searchParams = new URLSearchParams(location.search);
  const hasSearch = isHome && !!searchParams.get('location');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <Suspense fallback={null}><PaymentStatusBanner /></Suspense>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!hasSearch && <MapsDisclosure />}
      {!hasSearch && (
        <div className="w-full bg-slate-950 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-3 text-center text-[12px] text-slate-400">
            Licensed agents only · Trust account compliant · Australian property law · ABN 65 608 526 781
          </div>
        </div>
      )}
      {!hasSearch && <SiteFooter />}
      <BottomNav />
      <SupportWidget />
    </div>
  );
};

export default PublicLayout;
