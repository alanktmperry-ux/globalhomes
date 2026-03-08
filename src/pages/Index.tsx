import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Loader2, Zap, Map, List, Mic, GripVertical, ArrowUpDown } from 'lucide-react';
import { VoiceSearchHero } from '@/components/VoiceSearchHero';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/PropertyCardSkeleton';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { PropertyMap } from '@/components/PropertyMap';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useIsMobile } from '@/hooks/use-mobile';
import { manusSearch } from '@/lib/ManusSearchService';
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/lib/CurrencyContext';
import { FilterSidebar, Filters, defaultFilters } from '@/components/FilterSidebar';

type AreaSearch =
  | { type: 'circle'; center: [number, number]; radius: number }
  | { type: 'polygon'; coordinates: [number, number][] };

function isInsidePolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Index = () => {
  const { t } = useI18n();
  const { addSearch, lastSearch } = useSearchHistory();
  const { isSaved, toggleSaved } = useSavedProperties();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();

  const [results, setResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [manusStatus, setManusStatus] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const [splitPercent, setSplitPercent] = useState(55);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'beds'>('default');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDragging = useRef(false);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setManusStatus(null);
    addSearch(query);
    manusSearch.cancelPolling();

    try {
      const result = await manusSearch.search({ query }, (update) => {
        setManusStatus(update.status);
        if (update.status === 'completed' && update.properties && update.properties.length > 0) {
          setResults(update.properties);
          toast({ title: '🔍 Live results ready', description: `Found ${update.properties.length} properties` });
        } else if (update.status === 'failed') {
          setManusStatus(null);
        }
      });
      setResults(result.properties);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addSearch, toast]);

  const displayProperties = hasSearched ? results : mockProperties.slice(0, 6);

  const filteredProperties = useMemo(() => {
    let props = displayProperties;
    // Area filter
    if (areaSearch) {
      props = props.filter((p) => {
        if (!p.lat || !p.lng) return false;
        if (areaSearch.type === 'circle') {
          return haversineDistance(p.lat, p.lng, areaSearch.center[0], areaSearch.center[1]) <= areaSearch.radius;
        }
        return isInsidePolygon(p.lat, p.lng, areaSearch.coordinates);
      });
    }
    // Advanced filters
    props = props.filter(p => {
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(p.propertyType)) return false;
      if (p.beds < filters.minBeds) return false;
      if (p.baths < filters.minBaths) return false;
      if (p.parking < filters.minParking) return false;
      if (filters.features.length > 0 && !filters.features.every(f => p.features.some(pf => pf.toLowerCase().includes(f.toLowerCase())))) return false;
      return true;
    });
    // Sort
    if (sortBy === 'price-asc') return [...props].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...props].sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') return [...props].sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    if (sortBy === 'beds') return [...props].sort((a, b) => b.beds - a.beds);
    return props;
  }, [displayProperties, areaSearch, sortBy, filters]);

  const handleAreaSearch = useCallback((area: AreaSearch | null) => {
    setAreaSearch(area || null);
  }, []);

  const scrollToProperty = useCallback((propertyId: string) => {
    const el = cardRefs.current.get(propertyId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Draggable split handle
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setSplitPercent(Math.max(30, Math.min(70, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'price-asc', label: 'Price: Low–High' },
    { value: 'price-desc', label: 'Price: High–Low' },
    { value: 'newest', label: 'Newest' },
    { value: 'beds', label: 'Bedrooms' },
  ] as const;

  const statusBar = (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground shrink-0">
          {filteredProperties.length} properties
        </span>
        {hasSearched && (
          <span className="text-xs text-muted-foreground truncate">{t('search.results')}</span>
        )}
        {!hasSearched && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-primary" /> Recommended
          </span>
        )}
        {areaSearch && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
            {areaSearch.type === 'circle' ? `${Math.round(areaSearch.radius / 1000)}km` : 'Custom area'}
          </span>
        )}
        {manusStatus && (manusStatus === 'running' || manusStatus === 'pending') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
            <Loader2 size={12} className="animate-spin" />
            <span>Searching…</span>
          </motion.div>
        )}
        {manusStatus === 'completed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-xs text-success font-medium shrink-0">
            <Zap size={12} />
            <span>Live</span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Filter button */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(o => !o)}
          totalCount={displayProperties.length}
          filteredCount={filteredProperties.length}
        />

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none pl-7 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  );

  const propertyList = (
    <div className="space-y-3">
      {isSearching ? (
        [0, 1, 2].map(i => <PropertyCardSkeleton key={i} />)
      ) : (
        <>
          {filteredProperties.map((property, i) => (
            <div key={property.id} ref={el => { if (el) cardRefs.current.set(property.id, el); }}>
              <PropertyCard
                property={property}
                onSelect={(p) => {
                  setSelectedProperty(p);
                  if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: Date.now() });
                }}
                isSaved={isSaved(property.id)}
                onToggleSave={toggleSaved}
                index={i}
              />
            </div>
          ))}
          {filteredProperties.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {areaSearch ? 'No properties in this area.' : 'No properties found.'}
            </p>
          )}
        </>
      )}
    </div>
  );

  const mapComponent = (
    <PropertyMap
      properties={filteredProperties}
      onPropertySelect={setSelectedProperty}
      selectedPropertyId={selectedProperty?.id}
      onAreaSearch={handleAreaSearch}
      centerOn={mapCenter}
      onScrollToProperty={scrollToProperty}
      formatPrice={formatPrice}
    />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      {/* Voice Search Hero */}
      <VoiceSearchHero
        onSearch={handleSearch}
        onLocationSelect={(loc) => setMapCenter({ lat: loc.lat, lng: loc.lng, key: Date.now() })}
        resultCount={hasSearched ? filteredProperties.length : undefined}
        isSearching={isSearching}
      />

      {/* Desktop: Split view */}
      {!isMobile ? (
        <div className="flex-1 flex" style={{ height: 'calc(100vh - 300px)' }}>
          {/* Map panel */}
          <div style={{ width: `${splitPercent}%` }} className="relative">
            {mapComponent}
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className="w-[6px] shrink-0 cursor-col-resize bg-border hover:bg-primary/30 transition-colors flex items-center justify-center group"
          >
            <GripVertical size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          {/* List panel */}
          <div style={{ width: `${100 - splitPercent}%` }} className="overflow-y-auto p-4">
            {statusBar}
            {propertyList}
          </div>
        </div>
      ) : (
        /* Mobile: Map with bottom sheet */
        <div className="flex-1 relative" style={{ height: 'calc(100vh - 250px)' }}>
          {mobileView === 'map' ? (
            <>
              {/* Full-screen map */}
              <div className="absolute inset-0">{mapComponent}</div>

              {/* Bottom sheet */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl shadow-drawer border-t border-border"
                animate={{ height: bottomSheetExpanded ? '60%' : 120 }}
                transition={{ type: 'spring', damping: 25 }}
              >
                {/* Drag handle */}
                <button
                  onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
                  className="w-full flex justify-center py-2"
                >
                  <div className="w-10 h-1.5 rounded-full bg-muted" />
                </button>

                <div className="px-4 pb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {filteredProperties.length} properties
                  </span>
                  <div className="flex items-center gap-2">
                    <FilterSidebar
                      filters={filters}
                      onChange={setFilters}
                      isOpen={filtersOpen}
                      onToggle={() => setFiltersOpen(o => !o)}
                      totalCount={displayProperties.length}
                      filteredCount={filteredProperties.length}
                    />
                    <button
                      onClick={() => setMobileView('list')}
                      className="text-xs text-primary font-medium"
                    >
                      View list
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto px-4 pb-20" style={{ maxHeight: bottomSheetExpanded ? 'calc(100% - 60px)' : '40px' }}>
                  {propertyList}
                </div>
              </motion.div>

              {/* FAB for voice search */}
              <button
                onClick={() => {
                  const hero = document.querySelector('[aria-label="Start voice search"]') as HTMLButtonElement;
                  if (hero) { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => hero.click(), 500); }
                }}
                className="absolute bottom-[140px] right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center"
              >
                <Mic size={22} />
              </button>
            </>
          ) : (
            /* List-only mobile */
            <div className="p-4 overflow-y-auto h-full pb-24">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{filteredProperties.length} properties</span>
                <button onClick={() => setMobileView('map')} className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Map size={14} /> Show map
                </button>
              </div>
              {propertyList}
            </div>
          )}
        </div>
      )}

      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
        onToggleSave={toggleSaved}
      />
      <SiteFooter />
      <BottomNav />
    </div>
  );
};

export default Index;
