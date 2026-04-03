import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSuburbAuctionStats } from '@/hooks/useSuburbAuctionStats';

interface Props {
  suburb: string;
  state: string;
}

export function SuburbClearanceRate({ suburb, state }: Props) {
  const { stats, loading } = useSuburbAuctionStats(suburb, state);

  if (loading) return <div className="h-16 rounded-xl bg-muted animate-pulse" />;
  if (!stats || stats.sample_size < 3) return null;

  const rate = stats.clearance_rate;
  const isStrong = rate >= 70;
  const isWeak = rate < 50;
  const Icon = isStrong ? TrendingUp : isWeak ? TrendingDown : Minus;
  const colorClass = isStrong
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
    : isWeak
    ? 'text-destructive bg-destructive/10 border-destructive/20'
    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';

  const periodDate = new Date(stats.period_end);
  const periodLabel = periodDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${colorClass}`}>
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-lg font-bold">{Math.round(rate)}%</p>
        <p className="text-sm font-medium">{suburb} clearance rate</p>
        <p className="text-xs opacity-70 mt-0.5">
          ({stats.total_auctions} auctions, week to {periodLabel})
        </p>
      </div>
    </div>
  );
}
