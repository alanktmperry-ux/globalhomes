import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Home, Building2 } from 'lucide-react';
import { FixedSizeList } from 'react-window';
import { PropertyCard, CollabReaction } from '@/features/properties/components/PropertyCard';
import { PropertyCardSkeleton } from '@/features/properties/components/PropertyCardSkeleton';
import { Property } from '@/shared/lib/types';

const CARD_HEIGHT_MOBILE = 520;
const CARD_HEIGHT_DESKTOP = 540;
const GRID_GAP = 16;
const VIRTUALIZE_THRESHOLD = 20;

interface VirtualizedPropertyListProps {
  properties: Property[];
  isSearching: boolean;
  isMobile: boolean;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onSelect: (property: Property) => void;
  cardRefs: React.MutableRefObject<globalThis.Map<string, HTMLDivElement>>;
  // Collab
  isCollab?: boolean;
  getPropertyReactions?: (id: string) => CollabReaction[];
  onToggleReaction?: (propertyId: string, emoji: string) => void;
  hasPartnerViewed?: (id: string) => boolean;
  currentUserId?: string;
  // Empty state
  areaSearch?: unknown;
  searchRadius?: number | null;
  onClearAreaSearch?: () => void;
  listingMode?: 'sale' | 'rent';
}

// Memoized card to prevent re-renders during scroll
const MemoizedPropertyCard = memo(PropertyCard);

function DesktopRow({ index, style, data }: { index: number; style: React.CSSProperties; data: VirtualizedPropertyListProps }) {
  const { properties, isSaved, onToggleSave, onSelect, cardRefs, isCollab, getPropertyReactions, onToggleReaction, hasPartnerViewed, currentUserId } = data;
  const property = properties[index];
  if (!property) return null;
  return (
    <div style={{ ...style, paddingBottom: GRID_GAP }}>
      <div ref={el => { if (el) cardRefs.current.set(property.id, el); }}>
        <MemoizedPropertyCard
          property={property}
          onSelect={onSelect}
          isSaved={isSaved(property.id)}
          onToggleSave={onToggleSave}
          index={index}
          isCollab={isCollab}
          collabReactions={isCollab && getPropertyReactions ? getPropertyReactions(property.id) : undefined}
          onToggleReaction={isCollab ? onToggleReaction : undefined}
          partnerViewed={isCollab && hasPartnerViewed ? hasPartnerViewed(property.id) : undefined}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

function MobileRow({ index, style, data }: { index: number; style: React.CSSProperties; data: VirtualizedPropertyListProps }) {
  const { properties, isSaved, onToggleSave, onSelect, cardRefs, isCollab, getPropertyReactions, onToggleReaction, hasPartnerViewed, currentUserId } = data;
  const property = properties[index];
  if (!property) return null;

  return (
    <div style={{ ...style, paddingBottom: 12 }}>
      <div ref={el => { if (el) cardRefs.current.set(property.id, el); }}>
        <MemoizedPropertyCard
          property={property}
          onSelect={onSelect}
          isSaved={isSaved(property.id)}
          onToggleSave={onToggleSave}
          index={index}
          isCollab={isCollab}
          collabReactions={isCollab && getPropertyReactions ? getPropertyReactions(property.id) : undefined}
          onToggleReaction={isCollab ? onToggleReaction : undefined}
          partnerViewed={isCollab && hasPartnerViewed ? hasPartnerViewed(property.id) : undefined}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

export function VirtualizedPropertyList(props: VirtualizedPropertyListProps) {
  const { properties, isSearching, isMobile, areaSearch, searchRadius, onClearAreaSearch, listingMode } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const available = window.innerHeight - rect.top - 80; // Leave room for footer/nav
        setContainerHeight(Math.max(400, available));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (isSearching) {
    return (
      <div role="feed" aria-label="Property listings" className="space-y-3">
        {[0, 1, 2].map(i => <PropertyCardSkeleton key={i} />)}
      </div>
    );
  }

  if (properties.length === 0) {
    const isRentMode = listingMode === 'rent';
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
          {isRentMode ? <Building2 size={24} className="text-muted-foreground" /> : <Home size={24} className="text-muted-foreground" />}
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {isRentMode
            ? 'No rental listings found'
            : areaSearch
              ? 'No properties in this area'
              : 'No properties found'}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {isRentMode
            ? 'Try broadening your search or switching to "Buy" mode to see sale listings.'
            : (areaSearch || searchRadius)
              ? 'Some properties may be hidden because they don\'t have map coordinates yet.'
              : 'Try adjusting your filters or search query.'}
        </p>
        {areaSearch && onClearAreaSearch && (
          <button onClick={onClearAreaSearch} className="mt-3 text-xs text-primary font-medium hover:underline">
            Clear area filter
          </button>
        )}
      </div>
    );
  }

  // For small lists, render normally without virtualization overhead
  if (properties.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div role="feed" aria-label="Property listings" className="space-y-3">
        {properties.map((property, i) => (
          <div key={property.id} ref={el => { if (el) props.cardRefs.current.set(property.id, el); }}>
            <MemoizedPropertyCard
              property={property}
              onSelect={props.onSelect}
              isSaved={props.isSaved(property.id)}
              onToggleSave={props.onToggleSave}
              index={i}
              isCollab={props.isCollab}
              collabReactions={props.isCollab && props.getPropertyReactions ? props.getPropertyReactions(property.id) : undefined}
              onToggleReaction={props.isCollab ? props.onToggleReaction : undefined}
              partnerViewed={props.isCollab && props.hasPartnerViewed ? props.hasPartnerViewed(property.id) : undefined}
              currentUserId={props.currentUserId}
            />
          </div>
        ))}
      </div>
    );
  }

  // Virtualized rendering
  if (isMobile) {
    return (
      <div ref={containerRef} role="feed" aria-label="Property listings">
        <FixedSizeList
          height={containerHeight}
          itemCount={properties.length}
          itemSize={CARD_HEIGHT_MOBILE}
          width="100%"
          itemData={props}
          overscanCount={3}
        >
          {MobileRow}
        </FixedSizeList>
      </div>
    );
  }

  // Desktop: single column
  const rowCount = properties.length;
  return (
    <div ref={containerRef} role="feed" aria-label="Property listings">
      <FixedSizeList
        height={containerHeight}
        itemCount={rowCount}
        itemSize={CARD_HEIGHT_DESKTOP + GRID_GAP}
        width="100%"
        itemData={props}
        overscanCount={2}
      >
        {DesktopRow}
      </FixedSizeList>
    </div>
  );
}
