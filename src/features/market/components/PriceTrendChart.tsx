import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { useSuburbPriceTrend } from '../hooks/useMarketData';

const formatAbbrev = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

const formatMonth = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
};

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

interface Props {
  suburb: string;
  state: string;
  propertyType?: string;
}

export function PriceTrendChart({ suburb, state, propertyType: initialType }: Props) {
  const [months, setMonths] = useState(24);
  const [propType, setPropType] = useState(initialType ?? 'house');
  const { trend, loading } = useSuburbPriceTrend(suburb, state, propType, months);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center min-h-[280px]">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  const data = trend.map(t => ({
    ...t,
    month: formatMonth(t.period_month),
    price: t.median_price ?? 0,
    sales: t.total_sales ?? 0,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Median Sale Price — {suburb}, {state}
        </h3>
        <div className="flex gap-2">
          <div className="flex gap-1 rounded-lg bg-secondary p-0.5">
            {['house', 'unit'].map(t => (
              <button
                key={t}
                onClick={() => setPropType(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${
                  propType === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-secondary p-0.5">
            {[12, 24].map(m => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                  months === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="price"
            tickFormatter={formatAbbrev}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <YAxis yAxisId="sales" orientation="right" hide />
          <Tooltip
            formatter={(val: number, name: string) =>
              name === 'price' ? [formatAUD(val), 'Median'] : [val, 'Sales']
            }
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
          />
          <Bar yAxisId="sales" dataKey="sales" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} barSize={16} />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#priceGradient)"
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
