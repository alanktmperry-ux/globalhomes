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
import { supabase } from '@/integrations/supabase/client';

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
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [manusStatus, setManusStatus] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(true);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'beds'>('default');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDragging = useRef(false);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  // Fetch active properties from the database
  useEffect(() => {
    const fetchDbProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, agents(name, agency, phone, email, avatar_url, is_subscribed)')
        .eq('status', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const mapped: Property[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          address: p.address,
          suburb: p.suburb,
          state: p.state,
          country: p.country,
          price: p.price,
          priceFormatted: p.price_formatted,
          beds: p.beds,
          baths: p.baths,
          parking: p.parking,
          sqm: p.sqm,
          imageUrl: p.image_url || p.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          images: p.images || (p.image_url ? [p.image_url] : []),
          description: p.description || '',
          estimatedValue: p.estimated_value || '',
          propertyType: p.property_type || 'House',
          features: p.features || [],
          agent: p.agents ? {
            id: p.agent_id || '',
            name: p.agents.name || 'Agent',
            agency: p.agents.agency || '',
            phone: p.agents.phone || '',
            email: p.agents.email || '',
            avatarUrl: p.agents.avatar_url || '',
            isSubscribed: p.agents.is_subscribed || false,
          } : {
            id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false,
          },
          listedDate: p.listed_date || p.created_at,
          views: p.views,
          contactClicks: p.contact_clicks,
          status: 'listed' as const,
        }));
        setDbProperties(mapped);
      }
    };
    fetchDbProperties();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setManusStatus(null);
    setCurrentQuery(query);
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

  // Merge DB properties with mock, DB first, dedup by id
  const allProperties = useMemo(() => {
    const dbIds = new Set(dbProperties.map(p => p.id));
    const mockFiltered = mockProperties.slice(0, 6).filter(p => !dbIds.has(p.id));
    return [...dbProperties, ...mockFiltered];
  }, [dbProperties]);

  // When searching, merge DB properties that match the query with mock/Manus results
  const displayProperties = useMemo(() => {
    if (!hasSearched) return allProperties;

    const lastQuery = currentQuery.toLowerCase();
    const queryWords = lastQuery.split(/\s+/).filter(w => w.length > 2);

    // Filter DB properties that match the search query by location fields
    const matchingDbProps = dbProperties.filter(p => {
      const searchable = `${p.title} ${p.address} ${p.suburb} ${p.state} ${p.country} ${p.propertyType} ${p.description}`.toLowerCase();
      return queryWords.some(word => searchable.includes(word));
    });

    // Merge: DB matches first, then mock/Manus results, dedup by id
    const seenIds = new Set(matchingDbProps.map(p => p.id));
    const uniqueMockResults = results.filter(p => !seenIds.has(p.id));
    return [...matchingDbProps, ...uniqueMockResults];
  }, [hasSearched, allProperties, results, dbProperties, currentQuery]);

  const filteredProperties = useMemo(() => {
    let props = displayProperties;

    // Radius filter based on search center + selected radius
    if (searchCenter && searchRadius) {
      const radiusMeters = searchRadius * 1000;
      props = props.filter((p) => {
        if (!p.lat || !p.lng) {
          // For properties without coordinates, do text-based matching (keep them)
          return true;
        }
        return haversineDistance(p.lat, p.lng, searchCenter.lat, searchCenter.lng) <= radiusMeters;
      });
    }

    // Area filter (from map drawing)
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
  }, [displayProperties, areaSearch, sortBy, filters, searchCenter, searchRadius]);

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
        {searchRadius && (
          <button
            onClick={() => setSearchRadius(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0 hover:bg-primary/20 transition-colors"
          >
            Within {searchRadius} km ✕
          </button>
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
    <div className={isMobile ? "space-y-3" : "grid grid-cols-2 gap-4"}>
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
            <p className="text-center text-muted-foreground py-8 text-sm col-span-2">
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
        onLocationSelect={(loc) => {
          setMapCenter({ lat: loc.lat, lng: loc.lng, key: Date.now() });
          setSearchCenter({ lat: loc.lat, lng: loc.lng });
          setMapCollapsed(false);
        }}
        onRadiusChange={setSearchRadius}
        selectedRadius={searchRadius}
        resultCount={hasSearched ? filteredProperties.length : undefined}
        isSearching={isSearching}
      />

      {/* Desktop layout: compact map on top, then property list */}
      {!isMobile ? (
        <div className="flex-1 flex flex-col px-4 py-4 gap-4 max-w-7xl mx-auto w-full">
          {/* Collapsible map card */}
          <div className="relative">
            {/* Map header with collapse toggle */}
            <button
              onClick={() => setMapCollapsed(c => !c)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-t-xl bg-secondary border border-border border-b-0 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <span className="flex items-center gap-2">
                <Map size={16} className="text-muted-foreground" />
                Map view
              </span>
              <span className="text-xs text-muted-foreground">
                {mapCollapsed ? 'Show' : 'Hide'}
              </span>
            </button>
            
            {/* Map container */}
            <AnimatePresence>
              {!mapCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: mapFullscreen ? '70vh' : 180, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-b-xl overflow-hidden border border-border border-t-0 shadow-sm"
                >
                  {mapComponent}
                  {/* Expand to fullscreen */}
                  <button
                    onClick={() => setMapFullscreen(f => !f)}
                    className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border shadow-md text-xs font-medium text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
                  >
                    {mapFullscreen ? (
                      <>✕ Minimize</>
                    ) : (
                      <><ArrowRight size={14} className="rotate-90" /> Expand</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Property list */}
          <div>
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
                <div className="flex items-center gap-2">
                  <FilterSidebar
                    filters={filters}
                    onChange={setFilters}
                    isOpen={filtersOpen}
                    onToggle={() => setFiltersOpen(o => !o)}
                    totalCount={displayProperties.length}
                    filteredCount={filteredProperties.length}
                  />
                  <button onClick={() => setMobileView('map')} className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Map size={14} /> Show map
                  </button>
                </div>
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
