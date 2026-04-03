import { Gavel, Tag } from 'lucide-react';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

interface Props {
  soldPrice: number;
  soldDate: string;
  saleMethod?: string;
}

export function SoldPriceTag({ soldPrice, soldDate, saleMethod }: Props) {
  const isAuction = saleMethod === 'auction';
  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-bold text-foreground">{formatAUD(soldPrice)}</span>
      {isAuction && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          <Gavel size={10} /> Auction
        </span>
      )}
      <span className="text-xs text-muted-foreground">{formatDate(soldDate)}</span>
    </div>
  );
}
