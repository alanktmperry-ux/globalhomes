import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Zap } from 'lucide-react';
import type { FeaturedListing } from '../types';
import { useBoostAnalytics } from '../hooks/useBoostAnalytics';

interface Props {
  slots: FeaturedListing[];
  suburb: string;
}

function SlotBadge({ tier }: { tier: 'premier' | 'featured' }) {
  if (tier === 'premier') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
        <Star className="h-2.5 w-2.5 fill-current" /> Premier
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
      <Zap className="h-2.5 w-2.5 fill-current" /> Featured
    </span>
  );
}

function FeaturedCard({
  listing,
  onSelect,
}: {
  listing: FeaturedListing;
  onSelect: (l: FeaturedListing) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col text-left rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-md transition-all bg-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute top-2 left-2">
          <SlotBadge tier={listing.boostTier} />
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="font-semibold text-sm text-foreground leading-snug line-clamp-1">
          {listing.address}
        </p>
        <p className="text-xs text-muted-foreground">
          {listing.suburb}{listing.state ? `, ${listing.state}` : ''}
        </p>
        {listing.priceFormatted && (
          <p className="text-sm font-bold text-foreground mt-auto">
            {listing.priceFormatted}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {listing.beds != null && <span>{listing.beds} bd</span>}
          {listing.baths != null && <span>{listing.baths} ba</span>}
          {listing.parking != null && <span>{listing.parking} pk</span>}
        </div>
      </div>
    </button>
  );
}

export function FeaturedZone({ slots, suburb }: Props) {
  const navigate = useNavigate();
  const { recordImpression, recordClick } = useBoostAnalytics();
  const impressionsFired = useRef(false);

  // Fire impressions once on first render of the zone
  useEffect(() => {
    if (slots.length === 0 || impressionsFired.current) return;
    impressionsFired.current = true;
    slots.forEach(s => {
      recordImpression(s.id, s.boostTier, s.slotPosition, suburb);
    });
  }, [slots, suburb, recordImpression]);

  if (slots.length === 0) return null;

  function handleSelect(listing: FeaturedListing) {
    recordClick(listing.id, listing.boostTier, listing.slotPosition, suburb);
    navigate(`/properties/${listing.id}`);
  }

  return (
    <section aria-label="Featured listings">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-amber-500 fill-current" />
        <h2 className="text-sm font-semibold text-foreground">Featured in {suburb}</h2>
        <span className="text-xs text-muted-foreground ml-auto">Sponsored</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {slots.map(listing => (
          <FeaturedCard key={listing.id} listing={listing} onSelect={handleSelect} />
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground px-2">All listings · newest first</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    </section>
  );
}
