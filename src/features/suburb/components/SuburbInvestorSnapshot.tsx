import type { SuburbMarketStats } from '../types';

interface Props {
  stats: SuburbMarketStats;
  suburbName: string;
}

export function SuburbInvestorSnapshot({ stats, suburbName }: Props) {
  const score = (() => {
    let s = 50;
    if (stats.gross_yield) {
      if (stats.gross_yield > 6) s += 20;
      else if (stats.gross_yield > 4.5) s += 10;
      else if (stats.gross_yield < 3) s -= 10;
    }
    if (stats.median_sale_price_yoy) {
      if (stats.median_sale_price_yoy > 10) s += 15;
      else if (stats.median_sale_price_yoy > 5) s += 8;
      else if (stats.median_sale_price_yoy < 0) s -= 10;
    }
    if (stats.vacancy_rate) {
      if (stats.vacancy_rate < 2) s += 10;
      else if (stats.vacancy_rate > 4) s -= 10;
    }
    return Math.min(100, Math.max(0, s));
  })();

  const scoreLabel =
    score >= 75 ? 'Strong Investment' : score >= 55 ? 'Moderate Growth' : score >= 40 ? 'Balanced Market' : 'Below Average';
  const scoreColor =
    score >= 75 ? 'text-green-600' : score >= 55 ? 'text-amber-500' : score >= 40 ? 'text-primary' : 'text-red-500';

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <h3 className="font-display text-base font-semibold text-foreground mb-4">
        Investor Snapshot — {suburbName}
      </h3>
      <div className="flex items-center gap-6 mb-5">
        <div className="flex items-baseline gap-1">
          <p className={`font-display text-4xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-sm text-muted-foreground">/ 100</p>
        </div>
        <div>
          <p className={`font-display font-semibold text-lg ${scoreColor}`}>{scoreLabel}</p>
          <p className="text-xs text-muted-foreground">Investment score based on yield, growth &amp; vacancy</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gross Yield', value: stats.gross_yield ? `${stats.gross_yield.toFixed(1)}%` : '—' },
          {
            label: 'Price Growth',
            value:
              stats.median_sale_price_yoy != null
                ? `${stats.median_sale_price_yoy > 0 ? '+' : ''}${stats.median_sale_price_yoy.toFixed(1)}%`
                : '—',
          },
          { label: 'Vacancy Rate', value: stats.vacancy_rate ? `${stats.vacancy_rate.toFixed(1)}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-secondary text-center">
            <p className="font-display text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
