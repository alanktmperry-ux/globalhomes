import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SuburbRecord, SuburbMarketStats } from '../types';

interface Props {
  suburb: SuburbRecord | null;
  suburbName: string;
  stateUpper: string;
  stats: SuburbMarketStats | null;
}

export function SuburbHero({ suburb, suburbName, stateUpper, stats }: Props) {
  const yoy = stats?.median_sale_price_yoy;
  const YoyIcon = yoy == null ? Minus : yoy > 0 ? TrendingUp : TrendingDown;
  const yoyColor = yoy == null ? 'text-muted-foreground' : yoy > 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="bg-gradient-to-b from-secondary to-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin size={12} />
          Australia › {stateUpper} › {suburb?.lga ?? suburb?.region ?? 'Real Estate'}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          {suburbName}, {stateUpper}
        </h1>
        {suburb?.postcode && (
          <p className="text-sm text-muted-foreground mt-1">Postcode {suburb.postcode}</p>
        )}
        {suburb?.description && (
          <p className="text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">{suburb.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            {
              label: 'Median House Price',
              value: stats?.median_sale_price
                ? `$${(stats.median_sale_price / 1000).toFixed(0)}k`
                : '—',
              sub: yoy != null ? (
                <span className={`flex items-center gap-1 ${yoyColor}`}>
                  <YoyIcon size={12} />
                  {Math.abs(yoy).toFixed(1)}% YoY
                </span>
              ) : <span className="text-muted-foreground">market data</span>,
            },
            {
              label: 'Annual Sales',
              value: stats?.total_sales ?? '—',
              sub: <span className="text-muted-foreground">last 12 months</span>,
            },
            {
              label: 'Median Days on Market',
              value: stats?.avg_days_on_market
                ? `${Math.round(stats.avg_days_on_market)}d`
                : '—',
              sub: <span className="text-muted-foreground">houses</span>,
            },
            {
              label: 'Gross Rental Yield',
              value: stats?.gross_yield ? `${stats.gross_yield.toFixed(1)}%` : '—',
              sub: stats?.median_rent_pw ? (
                <span className="text-muted-foreground">${stats.median_rent_pw}/wk median</span>
              ) : <span className="text-muted-foreground">rental data</span>,
            },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 rounded-xl bg-card border border-border">
              <p className="font-display text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
              {sub && <p className="text-xs mt-1">{sub}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
