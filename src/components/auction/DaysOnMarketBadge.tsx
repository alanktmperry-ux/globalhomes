import { Clock } from 'lucide-react';

interface Props {
  daysOnMarket: number;
  suburbMedianDom: number | null;
  listingStatus: string;
}

export function DaysOnMarketBadge({ daysOnMarket, suburbMedianDom, listingStatus }: Props) {
  if (!daysOnMarket || daysOnMarket < 1) return null;
  if (['sold', 'off_market'].includes(listingStatus)) return null;

  const isFresh = daysOnMarket <= 7;
  const isAboveMedian = suburbMedianDom && daysOnMarket > suburbMedianDom * 1.5;
  const isBelowMedian = suburbMedianDom && daysOnMarket < suburbMedianDom * 0.7;

  let label = `${daysOnMarket} day${daysOnMarket !== 1 ? 's' : ''} on market`;
  let colorClass = 'text-muted-foreground bg-secondary';

  if (isFresh) {
    label = 'New listing';
    colorClass = 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30';
  } else if (isAboveMedian) {
    colorClass = 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30';
  } else if (isBelowMedian) {
    colorClass = 'text-primary bg-primary/10';
  }

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${colorClass}`}>
        <Clock size={12} />
        {label}
      </span>
      {suburbMedianDom && !isFresh && (
        <p className="text-[11px] text-muted-foreground pl-1">
          Suburb median: {suburbMedianDom} days
          {isAboveMedian && ' ↑ above average'}
          {isBelowMedian && ' ↓ below average'}
        </p>
      )}
    </div>
  );
}
