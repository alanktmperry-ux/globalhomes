import { useLiveAuction } from '../hooks/useLiveAuction';
import type { AuctionBid } from '@/types/auction';
import { useEffect, useRef } from 'react';

interface Props { auctionId: string; readOnly?: boolean; }

function BidRow({ bid }: { bid: AuctionBid }) {
  const isVendor = bid.bid_type === 'vendor';
  const isOpening = bid.bid_type === 'opening';

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
      bid.is_winning
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
        : 'bg-secondary/50'
    }`}>
      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">#{bid.bid_number}</span>
      {isVendor && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
          Vendor
        </span>
      )}
      {isOpening && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-muted-foreground">
          Opening
        </span>
      )}
      <span className={`font-semibold flex-1 ${bid.is_winning ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
        ${bid.bid_amount.toLocaleString('en-AU')}
      </span>
      {bid.reserve_met_at_this_bid && (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">On Market</span>
      )}
      {bid.is_winning && <span className="text-emerald-600">✓</span>}
    </div>
  );
}

export function BidFeed({ auctionId, readOnly }: Props) {
  const { bids, updates, reserveMet } = useLiveAuction(auctionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bids.length]);

  const soldUpdate = updates.find(u => u.update_type === 'sold');
  const passedInUpdate = updates.find(u => u.update_type === 'passed_in');

  return (
    <div className="space-y-2">
      {reserveMet && (
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-center text-sm font-bold text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-bottom">
          🟢 Reserve met — ON THE MARKET!
        </div>
      )}

      {soldUpdate && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white text-center font-bold">
          {soldUpdate.message}
        </div>
      )}

      {passedInUpdate && (
        <div className="p-3 rounded-xl bg-amber-500 text-white text-center font-bold">
          {passedInUpdate.message}
        </div>
      )}

      <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-1.5">
        {bids.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No bids yet</p>
        )}
        {bids.map(bid => <BidRow key={bid.id || bid.bid_number} bid={bid} />)}
      </div>
    </div>
  );
}
