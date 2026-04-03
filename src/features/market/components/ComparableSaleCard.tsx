import { Bed, Bath, Car, Ruler, CheckCircle } from 'lucide-react';
import type { ComparableSaleRecord } from '@/types/market';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

const methodLabel: Record<string, { label: string; className: string }> = {
  auction: { label: 'Auction', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  private_treaty: { label: 'Private Treaty', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  expression_of_interest: { label: 'EOI', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  set_date_sale: { label: 'Set Date', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
};

interface Props {
  sale: ComparableSaleRecord;
  compact?: boolean;
}

export function ComparableSaleCard({ sale, compact }: Props) {
  const method = methodLabel[sale.sale_method] ?? methodLabel.private_treaty;

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{sale.address}</p>
          <p className="text-xs text-muted-foreground">{sale.suburb}, {sale.state}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {sale.bedrooms != null && (
              <span className="flex items-center gap-1"><Bed size={12} /> {sale.bedrooms}</span>
            )}
            {sale.bathrooms != null && (
              <span className="flex items-center gap-1"><Bath size={12} /> {sale.bathrooms}</span>
            )}
            {sale.car_spaces != null && (
              <span className="flex items-center gap-1"><Car size={12} /> {sale.car_spaces}</span>
            )}
            {sale.land_size_sqm != null && (
              <span className="flex items-center gap-1"><Ruler size={12} /> {Math.round(sale.land_size_sqm)}m²</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <p className="text-base font-bold text-foreground">{formatAUD(sale.sold_price)}</p>
          {sale.price_per_sqm != null && (
            <p className="text-[11px] text-primary font-medium">${Math.round(sale.price_per_sqm).toLocaleString()}/m²</p>
          )}
          <p className="text-[11px] text-muted-foreground">{formatDate(sale.sold_date)}</p>
          {sale.days_on_market != null && !compact && (
            <p className="text-[11px] text-muted-foreground">{sale.days_on_market} DOM</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${method.className}`}>
          {method.label}
        </span>
        {sale.discount_pct != null && sale.discount_pct > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {sale.discount_pct.toFixed(1)}% below asking
          </span>
        )}
        {sale.is_verified && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={10} /> Verified
          </span>
        )}
      </div>
    </div>
  );
}
