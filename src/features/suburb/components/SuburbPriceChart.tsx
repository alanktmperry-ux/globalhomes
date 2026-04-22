// @ts-nocheck
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { SuburbPricePoint } from '../types';

interface Props {
  data: SuburbPricePoint[];
  suburbName: string;
}

const fmt = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}m` : `$${(v / 1_000).toFixed(0)}k`;

export function SuburbPriceChart({ data, suburbName }: Props) {
  const [period, setPeriod] = useState<12 | 24 | 60>(60);
  const filtered = data.slice(-period);

  if (!data.length) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
        Not enough sales data to show a price trend yet.
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Median Sale Price — {suburbName}
        </h2>
        <div className="flex gap-1">
          {([12, 24, 60] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                period === p
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {p === 12 ? '1Y' : p === 24 ? '2Y' : '5Y'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
            }}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={60} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number) => [fmt(v), 'Median Price']}
            labelFormatter={(v) => {
              const d = new Date(v as string);
              return d.toLocaleString('default', { month: 'long', year: 'numeric' });
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              fontSize: 12,
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Area type="monotone" dataKey="median_price" stroke="hsl(var(--primary))" fill="url(#priceGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
