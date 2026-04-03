import { usePriceHistory } from '../hooks/usePriceHistory';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Props { propertyId: string; }

export function PriceHistoryTimeline({ propertyId }: Props) {
  const { history, loading } = usePriceHistory(propertyId);
  if (loading || !history.length) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display font-semibold text-foreground mb-3">
        Price History
      </h3>
      <div className="space-y-2">
        {history.map(change => (
          <div key={change.id} className="flex items-center gap-3 text-sm py-2 border-b border-border/50 last:border-0">
            {change.change_pct < 0
              ? <TrendingDown className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <TrendingUp className="w-4 h-4 text-destructive flex-shrink-0" />
            }
            <span className={`font-semibold min-w-[60px] ${change.change_pct < 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {change.change_pct > 0 ? '+' : ''}{change.change_pct}%
            </span>
            <span className="text-muted-foreground">
              ${change.old_price.toLocaleString()} → ${change.new_price.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(change.changed_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
