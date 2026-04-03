import { Lock, TrendingUp } from 'lucide-react';
import type { ListingMode } from '../types';

interface Props {
  mode: ListingMode;
  closeDate?: string;
}

export function OffMarketBadge({ mode, closeDate }: Props) {
  if (mode === 'public') return null;

  const isEOI = mode === 'eoi';
  const daysLeft = closeDate
    ? Math.max(0, Math.ceil((new Date(closeDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isEOI
          ? 'bg-purple-100 text-purple-800 border border-purple-200'
          : 'bg-foreground text-background'
      }`}
    >
      {isEOI ? (
        <>
          <TrendingUp className="w-3 h-3" /> EOI{daysLeft !== null ? ` · ${daysLeft}d left` : ''}
        </>
      ) : (
        <>
          <Lock className="w-3 h-3" /> Off-Market
        </>
      )}
    </span>
  );
}
