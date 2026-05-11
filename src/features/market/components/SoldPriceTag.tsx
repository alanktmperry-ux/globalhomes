import { Gavel } from 'lucide-react';
import { useTranslation, formatCurrency, formatDate } from '@/shared/lib/i18n';

interface Props {
  soldPrice: number;
  soldDate: string;
  saleMethod?: string;
}

export function SoldPriceTag({ soldPrice, soldDate, saleMethod }: Props) {
  const { language } = useTranslation();
  const isAuction = saleMethod === 'auction';
  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-bold text-foreground">{formatCurrency(soldPrice, language)}</span>
      {isAuction && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          <Gavel size={10} /> Auction
        </span>
      )}
      <span className="text-xs text-muted-foreground">{formatDate(soldDate, language, { month: 'short', year: 'numeric' })}</span>
    </div>
  );
}
