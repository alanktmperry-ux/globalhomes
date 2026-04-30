import { useLocation } from "react-router-dom";

/**
 * Full-page skeleton shown as the Suspense fallback while a lazy-loaded
 * route chunk is downloading. Renders within the first paint (no JS work),
 * so users see structure immediately instead of a white screen.
 *
 * Two variants:
 *  - "dashboard": sidebar + main content blocks (agent/admin/seeker dashboards)
 *  - "public":    top nav + hero + content blocks (public marketing pages)
 */
export function PageSkeleton() {
  const { pathname } = useLocation();
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/broker") ||
    pathname.startsWith("/seeker");

  return isDashboard ? <DashboardSkeleton /> : <PublicSkeleton />;
}

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col gap-2 border-r border-border bg-card/40 p-4">
        <Block className="h-8 w-32 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Block key={i} className="h-9 w-full" />
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 md:p-6">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <Block className="h-8 w-8" />
          <Block className="h-5 w-20" />
          <Block className="h-8 w-8" />
        </div>

        {/* Page header */}
        <Block className="h-8 w-64 mb-2" />
        <Block className="h-4 w-96 max-w-full mb-6" />

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Block className="h-3 w-20" />
              <Block className="h-7 w-24" />
              <Block className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Content panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
            <Block className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Block key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Block className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PublicSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Top nav */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 md:px-8">
        <Block className="h-7 w-28" />
        <div className="hidden md:flex items-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-5 w-16" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Block className="h-9 w-9 rounded-full" />
          <Block className="h-9 w-20" />
        </div>
      </header>

      {/* Hero / page header */}
      <section className="px-4 md:px-8 py-8 md:py-12 max-w-6xl w-full mx-auto">
        <Block className="h-10 w-2/3 max-w-xl mb-4" />
        <Block className="h-5 w-1/2 max-w-md mb-8" />

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <Block className="h-44 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Block className="h-4 w-3/4" />
                <Block className="h-3 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Block className="h-3 w-10" />
                  <Block className="h-3 w-10" />
                  <Block className="h-3 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
