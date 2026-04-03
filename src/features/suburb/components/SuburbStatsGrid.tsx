import type { SuburbMarketStats } from '../types';

interface Props {
  stats: SuburbMarketStats;
}

export function SuburbStatsGrid({ stats }: Props) {
  const rows = [
    { label: 'Median Sale Price', value: stats.median_sale_price ? `$${stats.median_sale_price.toLocaleString()}` : '—' },
    { label: '12-Month Price Growth', value: stats.median_sale_price_yoy != null ? `${stats.median_sale_price_yoy > 0 ? '+' : ''}${stats.median_sale_price_yoy.toFixed(1)}%` : '—' },
    { label: 'Annual Sales Volume', value: stats.total_sales ?? '—' },
    { label: 'Avg Days on Market', value: stats.avg_days_on_market ? `${Math.round(stats.avg_days_on_market)} days` : '—' },
    { label: 'Auction Clearance', value: stats.clearance_rate ? `${Math.round(stats.clearance_rate)}%` : '—' },
    { label: 'Median Rent / Week', value: stats.median_rent_pw ? `$${stats.median_rent_pw.toLocaleString()}` : '—' },
    { label: 'Rental Yield', value: stats.gross_yield ? `${stats.gross_yield.toFixed(1)}%` : '—' },
    { label: 'Vacancy Rate', value: stats.vacancy_rate ? `${stats.vacancy_rate.toFixed(1)}%` : '—' },
    { label: 'Active Listings', value: stats.active_listings ?? '—' },
    { label: 'New This Month', value: stats.new_listings_30d ?? '—' },
    { label: 'Price per m²', value: stats.price_per_sqm ? `$${Math.round(stats.price_per_sqm).toLocaleString()}` : '—' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="p-3 rounded-xl bg-secondary border border-border">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-bold text-foreground mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}
