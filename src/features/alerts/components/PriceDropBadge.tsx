import { TrendingDown } from 'lucide-react';

interface Props {
  savedPrice: number;
  currentPrice: number;
  className?: string;
}

export function PriceDropBadge({ savedPrice, currentPrice, className = '' }: Props) {
  const drop = savedPrice - currentPrice;
  if (drop <= 0) return null;
  const pct = ((drop / savedPrice) * 100).toFixed(0);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      text-[11px] font-bold bg-emerald-500/10 text-emerald-600 ${className}`}>
      <TrendingDown className="w-3 h-3" />
      ↓ ${drop.toLocaleString()} ({pct}%)
    </span>
  );
}
