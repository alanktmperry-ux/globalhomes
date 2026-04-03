import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { usePriceGuideHistory } from '@/hooks/usePriceGuideHistory';

interface Props {
  propertyId: string;
  currentLow: number | null;
  currentHigh: number | null;
}

function formatPrice(n: number | null) {
  if (!n) return '—';
  return '$' + n.toLocaleString('en-AU');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function PriceGuideHistory({ propertyId }: Props) {
  const [open, setOpen] = useState(false);
  const { history, loading } = usePriceGuideHistory(propertyId);

  if (loading || history.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Price guide revised {history.length} time{history.length !== 1 ? 's' : ''}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-3 space-y-0">
          {history.map((entry, i) => {
            const prev = history[i + 1];
            const prevMid = prev ? ((prev.price_low ?? 0) + (prev.price_high ?? 0)) / 2 : null;
            const currMid = ((entry.price_low ?? 0) + (entry.price_high ?? 0)) / 2;
            const moved = prevMid ? currMid - prevMid : null;
            const isUp = moved && moved > 0;
            const isDown = moved && moved < 0;

            return (
              <div key={entry.id} className="flex gap-3 pb-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                  {i < history.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(entry.price_low)}
                      {entry.price_low && entry.price_high && entry.price_low !== entry.price_high
                        ? ` – ${formatPrice(entry.price_high)}` : ''}
                    </span>
                    {isUp && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <TrendingUp size={12} /> +${Math.abs(moved!).toLocaleString('en-AU')}
                      </span>
                    )}
                    {isDown && (
                      <span className="text-xs text-destructive flex items-center gap-0.5">
                        <TrendingDown size={12} /> –${Math.abs(moved!).toLocaleString('en-AU')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.changed_at)}</p>
                  {entry.note && <p className="text-xs text-muted-foreground italic mt-0.5">{entry.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
