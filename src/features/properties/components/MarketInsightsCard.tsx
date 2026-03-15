import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Home, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { Property } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface SuburbStats {
  medianRentWeekly: number | null;
  rentTrendPct: number | null;
  sampleSize: number;
}

interface PricePoint {
  month: string;
  rent: number;
}

interface MarketInsightsCardProps {
  property: Property;
}

export function MarketInsightsCard({ property }: MarketInsightsCardProps) {
  const [stats, setStats] = useState<SuburbStats | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const isRental = property.listingType === 'rent' || property.listingType === 'rental';

  useEffect(() => {
    if (!isRental || !property.suburb) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);

      // 1. Try suburb_stats table first
      const { data: statsRow } = await supabase
        .from('suburb_stats')
        .select('median_rent_weekly, rent_trend_pct, sample_size')
        .eq('suburb', property.suburb)
        .eq('state', property.state || '')
        .eq('beds', property.beds)
        .eq('period', 'current')
        .maybeSingle();

      if (cancelled) return;

      let medianRent: number | null = null;
      let trendPct: number | null = null;
      let sampleSize = 0;

      if (statsRow?.median_rent_weekly) {
        medianRent = statsRow.median_rent_weekly;
        trendPct = statsRow.rent_trend_pct ? Number(statsRow.rent_trend_pct) : null;
        sampleSize = statsRow.sample_size || 0;
      } else {
        // 2. Fallback: calculate live from properties table via RPC
        const { data: liveStats } = await supabase.rpc('get_suburb_rental_stats', {
          _suburb: property.suburb,
          _state: property.state || '',
          _beds: property.beds,
        });

        if (cancelled) return;

        if (liveStats && typeof liveStats === 'object') {
          const parsed = liveStats as Record<string, unknown>;
          medianRent = (parsed.median_rent_weekly as number) || null;
          sampleSize = (parsed.sample_size as number) || 0;
        }
      }

      setStats({ medianRentWeekly: medianRent, rentTrendPct: trendPct, sampleSize });

      // 3. Fetch 6-month price history for sparkline
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: historyRows } = await supabase
        .from('suburb_price_history')
        .select('month, median_rent_weekly')
        .eq('suburb', property.suburb)
        .eq('state', property.state || '')
        .eq('beds', property.beds)
        .gte('month', sixMonthsAgo.toISOString().split('T')[0])
        .order('month', { ascending: true });

      if (cancelled) return;

      if (historyRows && historyRows.length > 0) {
        setHistory(
          historyRows
            .filter((r) => r.median_rent_weekly != null)
            .map((r) => ({
              month: new Date(r.month).toLocaleDateString('en-AU', { month: 'short' }),
              rent: r.median_rent_weekly!,
            }))
        );
      } else if (medianRent) {
        // Generate synthetic sparkline from median with slight variance for visual context
        const synth: PricePoint[] = [];
        const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const monthlyTrend = (trendPct || 0) / 6;
        for (let i = 0; i < 6; i++) {
          const factor = 1 - ((5 - i) * monthlyTrend) / 100;
          synth.push({
            month: months[i],
            rent: Math.round(medianRent * factor),
          });
        }
        setHistory(synth);
      }

      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [property.suburb, property.state, property.beds, property.listingType, isRental]);

  // Don't render for non-rental listings
  if (!isRental) return null;

  // Loading state
  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  // No data available
  if (!stats?.medianRentWeekly) {
    return null;
  }

  const rentDiff = property.rentalWeekly
    ? property.rentalWeekly - stats.medianRentWeekly
    : null;
  const isBelow = rentDiff !== null && rentDiff < 0;
  const isAbove = rentDiff !== null && rentDiff > 0;
  const diffAbs = rentDiff !== null ? Math.abs(rentDiff) : 0;

  const trendUp = stats.rentTrendPct !== null && stats.rentTrendPct > 0;
  const trendDown = stats.rentTrendPct !== null && stats.rentTrendPct < 0;

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">Market Insights</h3>
          <p className="text-[10px] text-muted-foreground">
            {property.suburb}, {property.state}
            {stats.sampleSize > 0 && ` · ${stats.sampleSize} rental${stats.sampleSize > 1 ? 's' : ''} analyzed`}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Median line */}
        <div className="flex items-center gap-2">
          <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            Median for {property.beds}-bed in {property.suburb}:
          </span>
          <span className="text-xs font-semibold text-foreground ml-auto">
            ${stats.medianRentWeekly}/wk
          </span>
        </div>

        {/* Price comparison */}
        {rentDiff !== null && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
            isBelow
              ? 'bg-primary/10 text-primary'
              : isAbove
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
          }`}>
            {isBelow ? (
              <ArrowDown className="w-3.5 h-3.5 shrink-0" />
            ) : isAbove ? (
              <ArrowUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isBelow
                ? `$${diffAbs}/wk below suburb median — good value`
                : isAbove
                  ? `$${diffAbs}/wk above suburb median`
                  : 'At suburb median'
              }
            </span>
          </div>
        )}

        {/* Trend */}
        {stats.rentTrendPct !== null && (
          <div className="flex items-center gap-2">
            {trendUp ? (
              <TrendingUp className="w-3.5 h-3.5 text-destructive shrink-0" />
            ) : trendDown ? (
              <TrendingDown className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs text-muted-foreground">
              Price trend:
            </span>
            <span className={`text-xs font-semibold ml-auto ${
              trendUp ? 'text-destructive' : trendDown ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {trendUp ? '+' : ''}{Number(stats.rentTrendPct).toFixed(1)}% vs last month
            </span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {history.length >= 2 && (
        <div className="px-2 pb-2">
          <div className="rounded-xl bg-card/50 border border-border/50 p-2">
            <p className="text-[10px] text-muted-foreground mb-1 px-1">6-month rent trend</p>
            <ResponsiveContainer width="100%" height={64}>
              <AreaChart data={history} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rentSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                    padding: '4px 8px',
                  }}
                  formatter={(val: number) => [`$${val}/wk`, 'Median']}
                  labelFormatter={(label: string) => label}
                />
                <Area
                  type="monotone"
                  dataKey="rent"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#rentSparkGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between px-1 mt-0.5">
              {history.map((p, i) => (
                <span key={i} className="text-[9px] text-muted-foreground/60">{p.month}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
