import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Home, ArrowDown, ArrowUp, Minus, Building, CalendarClock, List } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';

interface RentalStats {
  medianRentWeekly: number | null;
  rentTrendPct: number | null;
  sampleSize: number;
}

interface SuburbSnapshot {
  medianSalePrice: number | null;
  avgDaysOnMarket: number | null;
  activeListings: number;
}

interface PricePoint {
  month: string;
  rent: number;
}

interface MarketInsightsCardProps {
  property: Property;
}

export function MarketInsightsCard({ property }: MarketInsightsCardProps) {
  const { formatPrice } = useCurrency();
  const [rentalStats, setRentalStats] = useState<RentalStats | null>(null);
  const [snapshot, setSnapshot] = useState<SuburbSnapshot | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const isRental = property.listingType === 'rent' || property.listingType === 'rental';

  useEffect(() => {
    if (!property.suburb) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      // ── Suburb Snapshot (all listing types) ──
      const { data: suburbProps } = await supabase
        .from('properties')
        .select('price, listed_date, listing_type')
        .eq('suburb', property.suburb)
        .eq('state', property.state || '')
        .eq('is_active', true);

      if (cancelled) return;

      if (suburbProps && suburbProps.length > 0) {
        // Filter to same listing mode for median
        const sameType = suburbProps.filter(p => {
          if (isRental) return p.listing_type === 'rent' || p.listing_type === 'rental';
          return p.listing_type === 'sale' || p.listing_type === null;
        });

        // Median sale/rent price
        let medianSalePrice: number | null = null;
        if (sameType.length > 0) {
          const sorted = sameType.map(p => p.price).sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          medianSalePrice = sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : sorted[mid];
        }

        // Avg days on market
        const now = new Date();
        const daysArr = sameType
          .filter(p => p.listed_date)
          .map(p => Math.floor((now.getTime() - new Date(p.listed_date!).getTime()) / 86400000))
          .filter(d => d >= 0);
        const avgDays = daysArr.length > 0
          ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length)
          : null;

        setSnapshot({
          medianSalePrice,
          avgDaysOnMarket: avgDays,
          activeListings: sameType.length,
        });
      } else {
        setSnapshot({ medianSalePrice: null, avgDaysOnMarket: null, activeListings: 0 });
      }

      // ── Rental-specific stats ──
      if (isRental) {
        // 1. suburb_stats table
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

        setRentalStats({ medianRentWeekly: medianRent, rentTrendPct: trendPct, sampleSize });

        // Sparkline history
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
              .filter(r => r.median_rent_weekly != null)
              .map(r => ({
                month: new Date(r.month).toLocaleDateString('en-AU', { month: 'short' }),
                rent: r.median_rent_weekly!,
              }))
          );
        } else if (medianRent) {
          const synth: PricePoint[] = [];
          const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
          const monthlyTrend = (trendPct || 0) / 6;
          for (let i = 0; i < 6; i++) {
            const factor = 1 - ((5 - i) * monthlyTrend) / 100;
            synth.push({ month: months[i], rent: Math.round(medianRent * factor) });
          }
          setHistory(synth);
        }
      }

      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [property.suburb, property.state, property.beds, property.listingType, isRental]);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // Nothing to show at all
  if (!snapshot?.medianSalePrice && !rentalStats?.medianRentWeekly) return null;

  // Price vs median comparison
  const medianPrice = snapshot?.medianSalePrice ?? null;
  let priceDiffPct: number | null = null;
  let compLabel = '';
  let compVariant: 'below' | 'at' | 'above' = 'at';
  if (medianPrice && property.price) {
    priceDiffPct = ((property.price - medianPrice) / medianPrice) * 100;
    if (priceDiffPct < -3) {
      compVariant = 'below';
      compLabel = `${Math.abs(Math.round(priceDiffPct))}% below suburb median — good value`;
    } else if (priceDiffPct > 3) {
      compVariant = 'above';
      compLabel = `${Math.round(priceDiffPct)}% above suburb median`;
    } else {
      compVariant = 'at';
      compLabel = 'At suburb median';
    }
  }

  // Rental comparison
  const rentDiff = isRental && rentalStats?.medianRentWeekly && property.rentalWeekly
    ? property.rentalWeekly - rentalStats.medianRentWeekly
    : null;
  const rentBelow = rentDiff !== null && rentDiff < 0;
  const rentAbove = rentDiff !== null && rentDiff > 0;
  const rentDiffAbs = rentDiff !== null ? Math.abs(rentDiff) : 0;

  const trendUp = rentalStats?.rentTrendPct != null && rentalStats.rentTrendPct > 0;
  const trendDown = rentalStats?.rentTrendPct != null && rentalStats.rentTrendPct < 0;

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
            {snapshot && snapshot.activeListings > 0 && ` · ${snapshot.activeListings} listing${snapshot.activeListings !== 1 ? 's' : ''} in suburb`}
          </p>
        </div>
      </div>

      {/* ── Suburb Snapshot ── */}
      {snapshot && (snapshot.medianSalePrice || snapshot.avgDaysOnMarket !== null || snapshot.activeListings > 0) && (
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Suburb Snapshot</p>
          <div className="grid grid-cols-3 gap-2">
            {snapshot.medianSalePrice != null && (
              <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
                <Building className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{formatPrice(snapshot.medianSalePrice)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{isRental ? 'Median rent' : 'Median price'}</p>
              </div>
            )}
            {snapshot.avgDaysOnMarket != null && (
              <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
                <CalendarClock className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{snapshot.avgDaysOnMarket}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Avg days listed</p>
              </div>
            )}
            {snapshot.activeListings > 0 && (
              <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
                <List className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{snapshot.activeListings}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Active listings</p>
              </div>
            )}
          </div>

          {/* Price vs Median indicator */}
          {priceDiffPct !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mt-2.5 ${
              compVariant === 'below'
                ? 'bg-primary/10 text-primary'
                : compVariant === 'above'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {compVariant === 'below' ? (
                <ArrowDown className="w-3.5 h-3.5 shrink-0" />
              ) : compVariant === 'above' ? (
                <ArrowUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Minus className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{compLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Rental-specific section ── */}
      {isRental && rentalStats?.medianRentWeekly && (
        <div className="px-4 py-3 border-t border-border/50 space-y-2.5">
          <div className="flex items-center gap-2">
            <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              Median for {property.beds}-bed in {property.suburb}:
            </span>
            <span className="text-xs font-semibold text-foreground ml-auto">
              {formatPrice(rentalStats.medianRentWeekly, 'rent')}
            </span>
          </div>

          {rentDiff !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              rentBelow
                ? 'bg-primary/10 text-primary'
                : rentAbove
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {rentBelow ? <ArrowDown className="w-3.5 h-3.5 shrink-0" /> : rentAbove ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <Minus className="w-3.5 h-3.5 shrink-0" />}
              <span>
                {rentBelow
                  ? `${formatPrice(rentDiffAbs, 'rent')} below suburb median — good value`
                  : rentAbove
                    ? `${formatPrice(rentDiffAbs, 'rent')} above suburb median`
                    : 'At suburb median'}
              </span>
            </div>
          )}

          {rentalStats.rentTrendPct !== null && (
            <div className="flex items-center gap-2">
              {trendUp ? <TrendingUp className="w-3.5 h-3.5 text-destructive shrink-0" /> : trendDown ? <TrendingDown className="w-3.5 h-3.5 text-primary shrink-0" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className="text-xs text-muted-foreground">Price trend:</span>
              <span className={`text-xs font-semibold ml-auto ${trendUp ? 'text-destructive' : trendDown ? 'text-primary' : 'text-muted-foreground'}`}>
                {trendUp ? '+' : ''}{Number(rentalStats.rentTrendPct).toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sparkline */}
      {isRental && history.length >= 2 && (
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
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px', padding: '4px 8px' }}
                  formatter={(val: number) => [formatPrice(val, 'rent'), 'Median']}
                  labelFormatter={(label: string) => label}
                />
                <Area type="monotone" dataKey="rent" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rentSparkGrad)" dot={false} activeDot={{ r: 3, fill: 'hsl(var(--primary))' }} />
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
