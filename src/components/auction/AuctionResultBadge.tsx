import { Trophy, Gavel, XCircle, ArrowRight } from 'lucide-react';
import { useAuctionResult } from '@/hooks/useAuctionResult';
import { Link } from 'react-router-dom';

interface Props {
  propertyId: string;
  agentId?: string;
}

const RESULT_CONFIG = {
  sold_at_auction: {
    label: 'Sold at auction',
    Icon: Trophy,
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  sold_prior: {
    label: 'Sold prior to auction',
    Icon: Trophy,
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  passed_in: {
    label: 'Passed in',
    Icon: Gavel,
    colorClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  withdrawn: {
    label: 'Auction withdrawn',
    Icon: XCircle,
    colorClass: 'bg-secondary border-border text-foreground',
    iconClass: 'text-muted-foreground',
  },
};

export function AuctionResultBadge({ propertyId, agentId }: Props) {
  const result = useAuctionResult(propertyId);
  if (!result) return null;

  const config = RESULT_CONFIG[result.result];

  return (
    <div className={`rounded-2xl border overflow-hidden ${config.colorClass}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <config.Icon size={22} className={`mt-0.5 shrink-0 ${config.iconClass}`} />
          <div className="space-y-1.5">
            <p className="font-semibold text-lg">{config.label}</p>

            {result.sold_price && (
              <p className="text-2xl font-bold">
                ${result.sold_price.toLocaleString('en-AU')}
              </p>
            )}

            {result.num_bidders != null && result.num_bidders > 0 && (
              <p className="text-sm opacity-80">
                {result.num_bidders} registered bidder{result.num_bidders !== 1 ? 's' : ''}
              </p>
            )}

            {result.auction_date && (
              <p className="text-sm opacity-70">
                {new Date(result.auction_date).toLocaleDateString('en-AU', {
                  weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}

            {result.result === 'passed_in' && (
              <div className="mt-3 p-4 rounded-xl bg-background/60 border border-border">
                <p className="text-sm font-medium text-foreground">
                  This property is now available for private negotiation
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendors often accept offers below reserve after a passed-in auction.
                  Contact the agent directly to negotiate.
                </p>
                {agentId && (
                  <Link
                    to={`/messages?to=${agentId}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Message agent <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
