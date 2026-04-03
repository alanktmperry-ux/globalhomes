import { useState } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useSuburbSummary } from '../hooks/useMarketData';

const formatAbbrev = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

interface Props {
  suburb: string;
  state: string;
  propertyType?: string;
}

export function SuburbMarketSnapshot({ suburb, state, propertyType: initialType }: Props) {
  const [propType, setPropType] = useState(initialType ?? 'house');
  const { summary, loading } = useSuburbSummary(suburb, state, propType);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center min-h-[120px]">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  if (!summary) return null;

  const yoy = summary.yoy_change_pct;
  const isPositive = yoy != null && yoy >= 0;

  const stats = [
    {
      label: 'Median Price (90d)',
      value: summary.median_price_90d ? formatAbbrev(summary.median_price_90d) : '—',
      sub: yoy != null ? (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(yoy).toFixed(1)}% YoY
        </span>
      ) : null,
    },
    { label: 'Sales Volume (12m)', value: summary.sales_volume_12m?.toLocaleString() ?? '—' },
    { label: 'Median DOM', value: summary.median_dom_90d != null ? `${Math.round(summary.median_dom_90d)} days` : '—' },
    { label: 'Clearance Rate', value: summary.auction_clearance_12m != null ? `${summary.auction_clearance_12m}%` : '—' },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{suburb} Market Snapshot</h3>
        <div className="flex gap-1 rounded-lg bg-secondary p-0.5">
          {['house', 'unit'].map(t => (
            <button
              key={t}
              onClick={() => setPropType(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                propType === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t === 'house' ? 'House' : 'Unit'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 pb-5 pt-2">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            {'sub' in s && s.sub}
          </div>
        ))}
      </div>
      <div className="px-5 pb-3">
        <p className="text-[11px] text-muted-foreground">
          Based on {summary.sales_volume_12m ?? 0} sales over 12 months · {summary.active_listings ?? 0} active listings
        </p>
      </div>
    </div>
  );
}
