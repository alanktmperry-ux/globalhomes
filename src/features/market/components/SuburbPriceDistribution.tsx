import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import type { ComparableSaleRecord } from '@/types/market';

const formatAbbrev = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

interface Props {
  sales: ComparableSaleRecord[];
  subjectPrice?: number;
}

export function SuburbPriceDistribution({ sales, subjectPrice }: Props) {
  const { buckets, median } = useMemo(() => {
    if (sales.length === 0) return { buckets: [], median: 0 };
    const prices = sales.map(s => s.sold_price).sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const med = prices[Math.floor(prices.length / 2)];
    const range = max - min;
    const numBuckets = Math.min(8, Math.max(4, Math.ceil(sales.length / 3)));
    const step = range / numBuckets;

    const result = Array.from({ length: numBuckets }, (_, i) => {
      const lo = min + step * i;
      const hi = min + step * (i + 1);
      const count = prices.filter(p => p >= lo && (i === numBuckets - 1 ? p <= hi : p < hi)).length;
      return { range: `${formatAbbrev(lo)}–${formatAbbrev(hi)}`, count, midpoint: (lo + hi) / 2 };
    });

    return { buckets: result, median: med };
  }, [sales]);

  if (buckets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Price Distribution</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={buckets} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="range" type="category" tick={{ fontSize: 10 }} width={100} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(val: number) => [`${val} sale${val !== 1 ? 's' : ''}`, 'Count']}
            contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" /> Median: {formatAbbrev(median)}
        </span>
        {subjectPrice && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> This property: {formatAbbrev(subjectPrice)}
          </span>
        )}
      </div>
    </div>
  );
}
