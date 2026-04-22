// @ts-nocheck
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/shared/lib/CurrencyContext';

interface PriceHistoryChartProps {
  propertyId: string;
  currentPrice: number;
  listedDate?: string;
  priceFormatted?: string;
  suburb?: string;
  state?: string;
  propertyType?: string;
}

interface PricePoint {
  date: string;
  price: number;
  label: string;
}

interface SuburbPoint {
  month: string;
  medianPrice: number;
  label: string;
}

export function PriceHistoryChart({ propertyId, currentPrice, listedDate, priceFormatted, suburb, state, propertyType }: PriceHistoryChartProps) {
  const { formatPrice } = useCurrency();
  const [data, setData] = useState<PricePoint[]>([]);
  const [suburbData, setSuburbData] = useState<SuburbPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // 1. Fetch property-specific price change events
      const { data: events } = await supabase
        .from('activities')
        .select('created_at, metadata')
        .eq('entity_type', 'property')
        .eq('action', 'price_change')
        .eq('entity_id', propertyId)
        .order('created_at', { ascending: true });

      if (events && events.length > 0) {
        const points: PricePoint[] = events.map(e => {
          const meta = e.metadata as Record<string, any> | null;
          const price = meta?.new_price ?? meta?.price ?? currentPrice;
          const d = new Date(e.created_at);
          return {
            date: e.created_at,
            price: Number(price),
            label: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }),
          };
        });

        // Prepend listed price if first event has old_price
        const firstMeta = events[0].metadata as Record<string, any> | null;
        if (firstMeta?.old_price && listedDate) {
          points.unshift({
            date: listedDate,
            price: Number(firstMeta.old_price),
            label: new Date(listedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }),
          });
        }

        setData(points);
      }

      // 2. Fetch suburb median trend data as context / fallback
      if (suburb) {
        let query = supabase
          .from('suburb_price_history')
          .select('month, median_sale_price')
          .ilike('suburb', suburb)
          .not('median_sale_price', 'is', null)
          .order('month', { ascending: true })
          .limit(24);

        if (state) query = query.eq('state', state);
        if (propertyType) query = query.ilike('property_type', propertyType);

        const { data: suburbRows } = await query;

        if (suburbRows && suburbRows.length > 0) {
          setSuburbData(suburbRows.map((r: any) => {
            const d = new Date(r.month + '-01');
            return {
              month: r.month,
              medianPrice: Number(r.median_sale_price),
              label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
            };
          }));
        }
      }

      setLoading(false);
    };
    fetchAll();
  }, [propertyId, currentPrice, listedDate, suburb, state, propertyType]);

  const listedStr = listedDate
    ? new Date(listedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'listing date';

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border shadow-card animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  // Nothing to show at all
  if (data.length === 0 && suburbData.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          Price History
        </h2>
        <div className="p-4 rounded-xl bg-secondary text-center">
          <p className="text-sm text-muted-foreground">
            No price history available yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Listed at <span className="font-semibold text-foreground">{priceFormatted || formatPrice(currentPrice)}</span> on{' '}
            <span className="font-semibold text-foreground">{listedStr}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-card space-y-5">
      {/* Property-specific price changes */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          Price History
        </h2>

        {data.length === 0 ? (
          <div className="p-4 rounded-xl bg-secondary text-center">
            <p className="text-sm text-muted-foreground">
              No price changes since listing.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Listed at <span className="font-semibold text-foreground">{priceFormatted || formatPrice(currentPrice)}</span> on{' '}
              <span className="font-semibold text-foreground">{listedStr}</span>
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'Price']}
                labelFormatter={(label: string) => label}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Line
                type="monotone"
                dataKey="price"
                className="stroke-primary"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Suburb median trend */}
      {suburbData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <BarChart3 size={15} className="text-muted-foreground" />
            {suburb} Median {propertyType || 'Property'} Price
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={suburbData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'Suburb Median']}
                labelFormatter={(label: string) => label}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Line
                type="monotone"
                dataKey="medianPrice"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            Based on recorded sales in {suburb}. This property is listed at {formatPrice(currentPrice)}.
          </p>
        </div>
      )}
    </div>
  );
}
