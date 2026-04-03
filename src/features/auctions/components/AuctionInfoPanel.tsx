import { MapPin, Clock, Users, Gavel } from 'lucide-react';
import { useAuctionPublic } from '../hooks/useAuction';
import { AuctionStatusBadge } from './AuctionStatusBadge';
import { AuctionCountdown } from './AuctionCountdown';
import { BidFeed } from './BidFeed';
import { useState } from 'react';
import { AuctionRegistrationModal } from './AuctionRegistrationModal';

interface Props { propertyId: string; }

export function AuctionInfoPanel({ propertyId }: Props) {
  const { auction, loading } = useAuctionPublic(propertyId);
  const [showRegModal, setShowRegModal] = useState(false);

  if (loading || !auction) return null;

  const dateLabel = new Date(auction.auction_date).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = auction.auction_time?.slice(0, 5);
  const isSold = ['sold', 'sold_prior', 'sold_after'].includes(auction.status);
  const isLive = auction.status === 'live';
  const canRegister = ['scheduled', 'open'].includes(auction.status);
  const isPassedIn = auction.status === 'passed_in';

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gavel size={18} className="text-primary" />
            <span className="font-semibold text-foreground">Auction</span>
          </div>
          <AuctionStatusBadge status={auction.status} />
        </div>

        {canRegister && (
          <AuctionCountdown auctionDate={auction.auction_date} auctionTime={auction.auction_time} status={auction.status} />
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock size={14} className="shrink-0" />
            <span>{dateLabel} at {timeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0" />
            <span>{auction.is_online ? `Online — ${auction.online_platform_url || 'Link TBC'}` : auction.auction_location}</span>
          </div>
          {auction.auctioneer_name && (
            <div className="flex items-center gap-2">
              <Gavel size={14} className="shrink-0" />
              <span>{auction.auctioneer_name}{auction.auctioneer_firm ? `, ${auction.auctioneer_firm}` : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users size={14} className="shrink-0" />
            <span>{auction.total_registered > 2 ? `${auction.total_registered} registered bidders` : 'Registrations open'}</span>
          </div>
        </div>

        {isSold && auction.sold_price && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Sold under the hammer</p>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
              ${auction.sold_price.toLocaleString('en-AU')}
            </p>
          </div>
        )}

        {isPassedIn && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Passed in — available for private sale</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Contact the agent directly to negotiate.</p>
          </div>
        )}

        {isLive && (
          <div className="space-y-3">
            {auction.last_bid_amount && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current bid</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ${auction.last_bid_amount.toLocaleString('en-AU')}
                </p>
              </div>
            )}
            <BidFeed auctionId={auction.id} readOnly />
          </div>
        )}

        {canRegister && (
          <button
            onClick={() => setShowRegModal(true)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Register to Bid
          </button>
        )}
      </div>

      {showRegModal && (
        <AuctionRegistrationModal
          auctionId={auction.id}
          isOnline={auction.is_online}
          open={showRegModal}
          onClose={() => setShowRegModal(false)}
        />
      )}
    </div>
  );
}
