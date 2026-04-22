// @ts-nocheck
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DailyViewPoint } from '../types';

interface Props {
  dailyViews: DailyViewPoint[];
  daysRange: number;
  onRangeChange: (days: number) => void;
}

const ranges = [7, 30, 90] as const;

export function ViewsChart({ dailyViews, daysRange, onRangeChange }: Props) {
  const [metric, setMetric] = useState<'both' | 'views' | 'unique'>('both');

  const data = dailyViews.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
  }));

  const allZero = data.every((d) => d.views === 0 && d.unique_views === 0);

  if (allZero) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground mb-3">No views recorded yet. Share your listing to get started.</p>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}>
          <Share2 className="h-4 w-4 mr-2" /> Share listing
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Views Over Time</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {ranges.map((r) => (
              <button key={r} onClick={() => onRangeChange(r)} className={`px-3 py-1 text-xs font-medium rounded-md transition ${daysRange === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {r}d
              </button>
            ))}
          </div>
          <div className="flex bg-muted rounded-lg p-0.5">
            {(['both', 'views', 'unique'] as const).map((m) => (
              <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1 text-xs font-medium rounded-md transition capitalize ${metric === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {m === 'both' ? 'Both' : m === 'views' ? 'Total' : 'Unique'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(217, 91%, 53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          {(metric === 'both' || metric === 'views') && (
            <Area type="monotone" dataKey="views" stroke="hsl(217, 91%, 53%)" fill="url(#viewsGrad)" strokeWidth={2} isAnimationActive />
          )}
          {(metric === 'both' || metric === 'unique') && (
            <Area type="monotone" dataKey="unique_views" stroke="hsl(217, 91%, 70%)" fill="url(#uniqueGrad)" strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
