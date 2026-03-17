import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Property } from '@/shared/lib/types';
import { PropertyCard } from '@/features/properties/components/PropertyCard';

// Adjacent suburb mapping (simple static map — extend as needed)
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

interface ViewedPattern {
  suburb: string;
  beds: number;
  count: number;
}

/**
 * Analyze viewed properties to find patterns (suburb + bed count combos
 * the user has viewed 3+ times).
 */
function detectPatterns(
  viewedIds: Set<string>,
  allProperties: Property[],
): ViewedPattern[] {
  const viewed = allProperties.filter(p => viewedIds.has(p.id));
  const buckets = new Map<string, number>();

  for (const p of viewed) {
    const key = `${p.suburb.toLowerCase()}|${p.beds}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const patterns: ViewedPattern[] = [];
  for (const [key, count] of buckets) {
    if (count >= 3) {
      const [suburb, beds] = key.split('|');
      patterns.push({ suburb, beds: Number(beds), count });
    }
  }

  // Sort by strongest signal first
  return patterns.sort((a, b) => b.count - a.count);
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
  const picks = useMemo(() => {
    if (viewedIds.size < 3) return { properties: [], reason: '' };

    const patterns = detectPatterns(viewedIds, allProperties);
    if (patterns.length === 0) return { properties: [], reason: '' };

    const top = patterns[0];
    const adjacent = getAdjacentSuburbs(top.suburb);

    // Collect matching properties the user hasn't viewed
    const candidates = allProperties.filter(p => {
      if (viewedIds.has(p.id)) return false;
      if (p.beds !== top.beds) return false;
      const pSuburb = p.suburb.toLowerCase();
      return pSuburb === top.suburb || adjacent.includes(pSuburb);
    });

    // Prioritize: same suburb first, then adjacent
    const sorted = candidates.sort((a, b) => {
      const aMatch = a.suburb.toLowerCase() === top.suburb ? 0 : 1;
      const bMatch = b.suburb.toLowerCase() === top.suburb ? 0 : 1;
      return aMatch - bMatch;
    });

    const suburbDisplay = top.suburb.charAt(0).toUpperCase() + top.suburb.slice(1);
    const reason = `Because you viewed ${top.count} similar ${top.beds}-bed properties in ${suburbDisplay}`;

    return {
      properties: sorted.slice(0, 6),
      reason,
    };
  }, [viewedIds, allProperties]);

  if (picks.properties.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
          <Sparkles size={14} className="text-primary" />
          <span className="text-sm font-display font-bold text-primary">AI Picks for You</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4 pl-1">{picks.reason}</p>

      {/* Cards */}
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
