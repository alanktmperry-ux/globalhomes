import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PerformanceKPIBar } from '@/features/vendor/components/PerformanceKPIBar';
import { ViewsChart } from '@/features/vendor/components/ViewsChart';
import { TrafficSourceChart } from '@/features/vendor/components/TrafficSourceChart';
import { DeviceSplitPie } from '@/features/vendor/components/DeviceSplitPie';
import { SuburbComparisonPanel } from '@/features/vendor/components/SuburbComparisonPanel';
import { OpenHomePerformanceList } from '@/features/vendor/components/OpenHomePerformanceList';
import type { PropertyPerformance, SuburbBenchmarks } from '@/features/vendor/types';

export default function VendorReportPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [perf, setPerf] = useState<PropertyPerformance | null>(null);
  const [bench, setBench] = useState<SuburbBenchmarks | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: tokenResults } = await supabase
        .rpc('lookup_vendor_report_token', { p_token: token });

      if (!tokenResults || tokenResults.length === 0) { setExpired(true); setLoading(false); return; }

      const row = tokenResults[0];
      const propertyId = row.property_id as string;
      const agentId = row.agent_id as string;

      // Update view count (fire and forget)
      supabase.from('vendor_report_tokens' as any)
        .update({ last_viewed: new Date().toISOString() } as any)
        .eq('id', row.id as string)
        .then(() => {});

      const [{ data: prop }, { data: ag }, perfResult, benchResult] = await Promise.all([
        supabase.from('properties').select('id, title, address, suburb, state, price, price_formatted, beds, baths, parking, sqm, property_type, image_url, images, description, listing_type, listed_date, views, contact_clicks, is_active').eq('id', propertyId).single(),
        supabase.from('agents').select('name, avatar_url, phone, email').eq('id', agentId).single(),
        supabase.rpc('get_property_performance', { p_property_id: propertyId, p_days: 30 }),
        supabase.rpc('get_suburb_benchmarks', { p_property_id: propertyId }),
      ]);

      setProperty(prop);
      setAgent(ag);
      setPerf(perfResult.data as unknown as PropertyPerformance);
      setBench(benchResult.data as unknown as SuburbBenchmarks);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (expired || !property || !perf) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4 p-6">
        <h1 className="text-2xl font-bold text-foreground">This report link has expired</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Contact your agent to request a new performance report link.
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet><meta name="robots" content="noindex" /></Helmet>
      <div className="vendor-report-content min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">ListHQ</span>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm text-foreground">{property.address}, {property.suburb} {property.state}</span>
            </div>
            <div className="flex items-center gap-3 no-print">
              {agent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Prepared by</span>
                  <Avatar className="h-6 w-6"><AvatarImage src={agent.avatar_url} /><AvatarFallback className="text-xs">{agent.name?.[0]}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()} className="print-include">
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Property Performance Report</h1>
            <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <PerformanceKPIBar performance={perf} />
          <ViewsChart dailyViews={perf.daily_views ?? []} daysRange={30} onRangeChange={() => {}} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 chart-panel">
            <TrafficSourceChart viewSources={perf.view_sources ?? {}} />
            <DeviceSplitPie deviceSplit={perf.device_split ?? {}} />
          </div>

          {bench && <SuburbComparisonPanel performance={perf} benchmarks={bench} />}
          <OpenHomePerformanceList propertyId={property.id} />

          {/* Agent contact */}
          {agent && (
            <div className="agent-footer bg-card rounded-xl border border-border p-6 flex items-center gap-4">
              <Avatar className="h-12 w-12"><AvatarImage src={agent.avatar_url} /><AvatarFallback>{agent.name?.[0]}</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold text-foreground">{agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.phone} · {agent.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Questions about your listing? Contact {agent.name} directly.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
