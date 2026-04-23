import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Property } from '@/shared/lib/types';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { supabase } from '@/integrations/supabase/client';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';

// Adjacent suburb mapping
const ADJACENT_SUBURBS: Record<string, string[]> = {
  richmond: ['cremorne', 'burnley', 'abbotsford', 'collingwood', 'east melbourne'],
  cremorne: ['richmond', 'south yarra', 'prahran'],
  bondi: ['bondi junction', 'bronte', 'tamarama', 'north bondi'],
  surry_hills: ['darlinghurst', 'redfern', 'paddington'],
  paddington: ['woollahra', 'surry hills', 'darlinghurst'],
  south_yarra: ['toorak', 'prahran', 'cremorne'],
  manly: ['fairlight', 'freshwater', 'queenscliff'],
  newtown: ['enmore', 'erskineville', 'camperdown'],
  fitzroy: ['collingwood', 'carlton', 'clifton hill'],
  collingwood: ['fitzroy', 'abbotsford', 'richmond'],
};

function getAdjacentSuburbs(suburb: string): string[] {
  const key = suburb.toLowerCase().replace(/\s+/g, '_');
  return ADJACENT_SUBURBS[key] || [];
}

interface AiPicksSectionProps {
  viewedIds: Set<string>;
  allProperties: Property[];
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onSelect: (p: Property) => void;
  isMobile: boolean;
}

export function AiPicksSection({
  viewedIds,
  allProperties,
  isSaved,
  onToggleSave,
  onSelect,
  isMobile,
}: AiPicksSectionProps) {
  // If no properties at all, render nothing
  if (allProperties.length === 0) return null;
  const [popularListings, setPopularListings] = useState<Property[]>([]);

  // Fetch top-viewed listings for the "Popular near you" fallback
  useEffect(() => {
    if (viewedIds.size >= 2) return; // no need if we have enough views
    supabase
      .from('properties')
      .select('*, agents(id, name, agency, phone, email, avatar_url, is_subscribed, rating, review_count)')
      .eq('is_active', true)
      .not('agent_id', 'is', null)
      .order('views', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setPopularListings(data.map(mapDbProperty));
      });
  }, [viewedIds.size]);

  const picks = useMemo(() => {
    if (viewedIds.size < 2) return null;

    const viewed = allProperties.filter(p => viewedIds.has(p.id));
    if (viewed.length < 2) return null;

    // Aggregate signals from all viewed properties
    const typeCounts = new Map<string, number>();
    let totalPrice = 0;
    let priceCount = 0;
    const suburbCounts = new Map<string, number>();

    for (const p of viewed) {
      const t = p.propertyType || 'House';
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      suburbCounts.set(p.suburb.toLowerCase(), (suburbCounts.get(p.suburb.toLowerCase()) || 0) + 1);
      if (p.price > 0) {
        totalPrice += p.price;
        priceCount++;
      }
    }

    // Dominant property type
    const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // Average price with ±30% range
    const avgPrice = priceCount > 0 ? totalPrice / priceCount : 0;
    const priceLow = avgPrice * 0.7;
    const priceHigh = avgPrice * 1.3;
    // Top suburb
    const topSuburb = [...suburbCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const adjacent = getAdjacentSuburbs(topSuburb);

    const candidates = allProperties.filter(p => {
      if (viewedIds.has(p.id)) return false;
      // Must match property type
      if ((p.propertyType || 'House') !== topType) return false;
      // Must be within price range (if we have price data)
      if (avgPrice > 0 && (p.price < priceLow || p.price > priceHigh)) return false;
      return true;
    });

    // Score: same suburb > adjacent suburb > other
    const scored = candidates.map(p => {
      const sub = p.suburb.toLowerCase();
      const score = sub === topSuburb ? 3 : adjacent.includes(sub) ? 2 : 1;
      return { property: p, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const priceLabel = avgPrice > 0
      ? ` around ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(avgPrice)}`
      : '';
    const reason = `Based on your interest in ${topType} properties${priceLabel}`;

    return {
      properties: scored.slice(0, 6).map(s => s.property),
      reason,
    };
  }, [viewedIds, allProperties]);

  // Personalized picks
  if (picks && picks.properties.length > 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
            <Sparkles size={14} className="text-primary" />
            <span className="text-sm font-display font-bold text-primary">AI Picks for You</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4 pl-1">{picks.reason}</p>
        <div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'}>
          {picks.properties.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              onSelect={onSelect}
              isSaved={isSaved(property.id)}
              onToggleSave={onToggleSave}
              index={i}
            />
          ))}
        </div>
      </motion.section>
    );
  }

  // Fallback: Popular near you (no views yet)
  if (popularListings.length > 0 && viewedIds.size < 2) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent">
            <TrendingUp size={14} className="text-foreground" />
            <span className="text-sm font-display font-bold text-foreground">Popular Near You</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4 pl-1">Top viewed listings right now</p>
        <div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'}>
          {popularListings.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              onSelect={onSelect}
              isSaved={isSaved(property.id)}
              onToggleSave={onToggleSave}
              index={i}
            />
          ))}
        </div>
      </motion.section>
    );
  }

  return null;
}
