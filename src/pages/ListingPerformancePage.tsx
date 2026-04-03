import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePropertyPerformance } from '@/features/vendor/hooks/usePropertyPerformance';
import { PerformanceKPIBar } from '@/features/vendor/components/PerformanceKPIBar';
import { ViewsChart } from '@/features/vendor/components/ViewsChart';
import { TrafficSourceChart } from '@/features/vendor/components/TrafficSourceChart';
import { DeviceSplitPie } from '@/features/vendor/components/DeviceSplitPie';
import { SuburbComparisonPanel } from '@/features/vendor/components/SuburbComparisonPanel';
import { RecentEnquiriesFeed } from '@/features/vendor/components/RecentEnquiriesFeed';
import { OpenHomePerformanceList } from '@/features/vendor/components/OpenHomePerformanceList';
import { VendorSharePanel } from '@/features/vendor/components/VendorSharePanel';

export default function ListingPerformancePage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { performance, benchmarks, loading, error } = usePropertyPerformance(propertyId, days);
  const [property, setProperty] = useState<any>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [propLoading, setPropLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    supabase
      .from('properties')
      .select('id, address, suburb, state, status, images, agent_id, listed_at, created_at')
      .eq('id', propertyId)
      .single()
      .then(({ data }) => {
        setProperty(data);
        setAgentId(data?.agent_id ?? null);
        setPropLoading(false);
      });
  }, [propertyId]);

  const isAgent = !!agentId; // simplified — could check user.id matches agent's user_id

  if (propLoading || loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Performance data not available</p>
        <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const dom = performance.days_on_market;

  return (
    <div className="vendor-report-content p-6 space-y-6 max-w-6xl mx-auto">
      <Link to="/dashboard/listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All Listings
      </Link>

      {/* Property hero */}
      {property && (
        <div className="flex items-center gap-4">
          {property.images?.[0] && (
            <img src={property.images[0]} alt="" className="w-28 h-20 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{property.address}, {property.suburb} {property.state}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">{property.status}</Badge>
              <span className="text-sm text-muted-foreground">Day {dom}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      )}

      {/* Days range selector */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit no-print">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${days === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {d} days
          </button>
        ))}
      </div>

      <PerformanceKPIBar performance={performance} />
      <ViewsChart dailyViews={performance.daily_views ?? []} daysRange={days} onRangeChange={setDays} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 chart-panel">
        <TrafficSourceChart viewSources={performance.view_sources ?? {}} />
        <DeviceSplitPie deviceSplit={performance.device_split ?? {}} />
        {benchmarks && <SuburbComparisonPanel performance={performance} benchmarks={benchmarks} />}
      </div>

      {propertyId && <RecentEnquiriesFeed propertyId={propertyId} isAgent={isAgent} />}
      {propertyId && <OpenHomePerformanceList propertyId={propertyId} />}
      {propertyId && agentId && <VendorSharePanel propertyId={propertyId} agentId={agentId} />}
    </div>
  );
}
