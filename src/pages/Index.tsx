import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, PanInfo } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Loader2, Zap, Map, List, Mic, GripVertical, ArrowUpDown, X, Bookmark, Share2 } from 'lucide-react';
import { VoiceSearchHero } from '@/components/VoiceSearchHero';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/PropertyCardSkeleton';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { PropertyMap } from '@/components/PropertyMap';
import { MapErrorBoundary } from '@/features/properties/components/MapErrorBoundary';
import { VoiceSearchErrorBoundary } from '@/features/search/components/VoiceSearchErrorBoundary';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useIsMobile } from '@/hooks/use-mobile';
import { Property } from '@/lib/types';
import { useCurrency } from '@/lib/CurrencyContext';
import { FilterSidebar } from '@/components/FilterSidebar';
import { usePropertySearch } from '@/hooks/usePropertySearch';
import { Slider } from '@/components/ui/slider';
import { useSavedSearches } from '@/hooks/useSavedSearches';

const Index = () => {
  const { t } = useI18n();
  const { addSearch, lastSearch } = useSearchHistory();
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { savedSearches, saveSearch, removeSearch } = useSavedSearches();

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const viewedPropertiesRef = useRef(new Set<string>());
  const sessionStartRef = useRef(Date.now());
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; key?: number | string } | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const SNAP_POINTS = [0.35, 0.65, 0.85];
  const [sheetSnap, setSheetSnap] = useState(0); // index into SNAP_POINTS
  const sheetHeightMV = useMotionValue(viewportHeight * SNAP_POINTS[0]);
  const sheetHeightSpring = useSpring(sheetHeightMV, { stiffness: 300, damping: 30 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusSliderOpen, setRadiusSliderOpen] = useState(false);
  const isDragging = useRef(false);
  const cardRefs = useRef<globalThis.Map<string, HTMLDivElement>>(new globalThis.Map());

  // ── Search hook (filters & sort internalized) ────────────────
  const {
    filteredProperties,
    displayProperties,
    handleSearch,
    refreshAIResults,
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius,
    clearSearchRadius,
    isSearching,
    hasSearched,
    manusStatus,
    manusFailed,
    usingCachedAI,
    currentQuery,
    searchRadius,
    searchCenter,
    areaSearch,
    sortBy,
    setSortBy,
    filters,
    setFilters,
  } = usePropertySearch({ addSearch });

  const initializedFromUrl = useRef(false);

  // ── Restore search state from URL on mount ───────────────────
  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;

    const params = new URLSearchParams(window.location.search);
    const location = params.get('location');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const radius = params.get('radius');
    const types = params.get('type');
    const beds = params.get('beds');
    const baths = params.get('baths');
    const sort = params.get('sort');

    if (minPrice || maxPrice || types || beds || baths) {
      setFilters(prev => ({
        ...prev,
        priceRange: [
          minPrice ? Number(minPrice) : prev.priceRange[0],
          maxPrice ? Number(maxPrice) : prev.priceRange[1],
        ],
        propertyTypes: types ? types.split(',') : prev.propertyTypes,
        minBeds: beds ? Number(beds) : prev.minBeds,
        minBaths: baths ? Number(baths) : prev.minBaths,
      }));
    }
    if (sort) setSortBy(sort as typeof sortBy);
    if (radius) setSearchRadius(Number(radius));
    if (location) {
      handleSearch(location);
    }
  }, []);

  // ── Push search state to URL ─────────────────────────────────
  useEffect(() => {
    if (!initializedFromUrl.current) return;

    const params = new URLSearchParams();
    if (currentQuery) params.set('location', currentQuery);
    if (filters.priceRange[0] > 0) params.set('minPrice', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 5_000_000) params.set('maxPrice', String(filters.priceRange[1]));
    if (filters.propertyTypes.length > 0) params.set('type', filters.propertyTypes.join(','));
    if (filters.minBeds > 0) params.set('beds', String(filters.minBeds));
    if (filters.minBaths > 0) params.set('baths', String(filters.minBaths));
    if (searchRadius) params.set('radius', String(searchRadius));
    if (sortBy !== 'default') params.set('sort', sortBy);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', newUrl);
    }
  }, [currentQuery, filters, searchRadius, sortBy]);

  // ── Handle browser back/forward ──────────────────────────────
  useEffect(() => {
    const onPopState = () => {
      initializedFromUrl.current = false;
      // Re-trigger the mount logic
      const params = new URLSearchParams(window.location.search);
      const location = params.get('location');
      const minPrice = params.get('minPrice');
      const maxPrice = params.get('maxPrice');
      const radius = params.get('radius');
      const types = params.get('type');
      const beds = params.get('beds');
      const baths = params.get('baths');
      const sort = params.get('sort');

      setFilters(prev => ({
        ...prev,
        priceRange: [
          minPrice ? Number(minPrice) : 0,
          maxPrice ? Number(maxPrice) : 5_000_000,
        ],
        propertyTypes: types ? types.split(',') : [],
        minBeds: beds ? Number(beds) : 0,
        minBaths: baths ? Number(baths) : 0,
      }));
      if (sort) setSortBy(sort as typeof sortBy);
      else setSortBy('default');
      if (radius) setSearchRadius(Number(radius));
      else clearSearchRadius();
      if (location) handleSearch(location);

      initializedFromUrl.current = true;
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleSearch, setFilters, setSortBy, setSearchRadius, clearSearchRadius]);

  // ── Track property views for lead scoring ─────────────────────
  const handleSelectProperty = useCallback((p: Property | null) => {
    if (p) viewedPropertiesRef.current.add(p.id);
    setSelectedProperty(p);
  }, []);

  // ── Build search context for lead capture ────────────────────
  const searchContextForLead = useMemo(() => ({
    currentFilters: {
      priceRange: filters.priceRange as [number, number],
      propertyTypes: filters.propertyTypes,
      minBeds: filters.minBeds,
      minBaths: filters.minBaths,
    },
    currentQuery: currentQuery || undefined,
    searchRadius: searchRadius || undefined,
    savedPropertiesCount: savedIds.size,
    viewedPropertiesCount: viewedPropertiesRef.current.size,
    savedSearchesCount: savedSearches.length,
    sessionDurationMinutes: Math.round((Date.now() - sessionStartRef.current) / 60000),
  }), [filters, currentQuery, searchRadius, savedIds.size, savedSearches.length]);

  // ── Scroll to card on map click ──────────────────────────────
  const scrollToProperty = useCallback((propertyId: string) => {
    const el = cardRefs.current.get(propertyId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ── Draggable split handle ───────────────────────────────────
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Track viewport height (handles keyboard open/close on mobile)
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  // Sync spring with snap point and viewport
  useEffect(() => {
    sheetHeightMV.set(viewportHeight * SNAP_POINTS[sheetSnap]);
  }, [viewportHeight, sheetSnap]);

  const handleSheetDragEnd = useCallback((_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const currentH = sheetHeightMV.get();
    const currentPct = currentH / viewportHeight;

    // Use velocity to determine direction, then snap
    let targetIdx = sheetSnap;
    if (velocity < -300) {
      // Flick up → next larger snap
      targetIdx = Math.min(sheetSnap + 1, SNAP_POINTS.length - 1);
    } else if (velocity > 300) {
      // Flick down → next smaller snap
      targetIdx = Math.max(sheetSnap - 1, 0);
    } else {
      // Find nearest snap point
      let minDist = Infinity;
      SNAP_POINTS.forEach((sp, i) => {
        const dist = Math.abs(currentPct - sp);
        if (dist < minDist) { minDist = dist; targetIdx = i; }
      });
    }
    setSheetSnap(targetIdx);
  }, [viewportHeight, sheetSnap]);

  useEffect(() => {
    let rafId: number | null = null;
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const pct = (e.clientX / window.innerWidth) * 100;
        setSplitPercent(Math.max(30, Math.min(70, pct)));
        rafId = null;
      });
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isDragging.current) onUp();
    };
  }, []);

  // ── Rendering helpers ────────────────────────────────────────
  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'price-asc', label: 'Price: Low–High' },
    { value: 'price-desc', label: 'Price: High–Low' },
    { value: 'newest', label: 'Newest' },
    { value: 'beds', label: 'Bedrooms' },
  ] as const;

  const statusBar = (
    <>
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
          <div className="relative shrink-0">
            <button
              onClick={() => setRadiusSliderOpen(o => !o)}
              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
            >
              Within {searchRadius} km
              <X size={10} className="opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); clearSearchRadius(); setRadiusSliderOpen(false); }} />
            </button>
            <AnimatePresence>
              {radiusSliderOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-2 z-30 bg-card border border-border rounded-xl shadow-elevated p-3 w-56"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">Radius: {searchRadius} km</span>
                    <button onClick={() => setRadiusSliderOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                  <Slider
                    value={[searchRadius]}
                    onValueChange={([v]) => setSearchRadius(v)}
                    min={5}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>5 km</span>
                    <span>100 km</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {areaSearch && (
          <button
            onClick={() => handleAreaSearch(null)}
            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0 hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
          >
            {areaSearch.type === 'circle' ? `${Math.round(areaSearch.radius / 1000)}km circle` : 'Custom area'}
            <X size={10} className="opacity-60" />
          </button>
        )}
        {manusStatus && (manusStatus === 'running' || manusStatus === 'pending') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
            <Loader2 size={12} className="animate-spin" />
            <span className="truncate max-w-[200px]">
              Searching: {currentQuery.length > 40 ? currentQuery.slice(0, 40) + '…' : currentQuery}
            </span>
          </motion.div>
        )}
        {manusStatus === 'completed' && !usingCachedAI && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-xs text-success font-medium shrink-0">
            <Zap size={12} />
            <span>AI results live</span>
          </motion.div>
        )}
        {usingCachedAI && !isSearching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Zap size={12} />
              Cached AI results
            </span>
            <button
              onClick={refreshAIResults}
              className="text-[11px] text-primary font-medium hover:underline"
            >
              Refresh
            </button>
          </motion.div>
        )}
        {manusFailed && !usingCachedAI && !isSearching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">AI search paused — showing database results</span>
            <button
              onClick={refreshAIResults}
              className="text-[11px] text-primary font-medium hover:underline"
            >
              Retry
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Save this search */}
        {hasSearched && (
          <button
            onClick={() => saveSearch({
              query: currentQuery,
              filters,
              radius: searchRadius ?? undefined,
              center: searchCenter ?? undefined,
            })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Bookmark size={12} />
            Save
          </button>
        )}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(o => !o)}
          totalCount={displayProperties.length}
          filteredCount={filteredProperties.length}
        />
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

    {/* Saved searches chips */}
    {savedSearches.length > 0 && (
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">Saved:</span>
        {savedSearches.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSearch(s.query)}
            className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Bookmark size={10} className="text-primary" />
            <span className="max-w-[120px] truncate">{s.label}</span>
            <X
              size={10}
              className="opacity-0 group-hover:opacity-60 transition-opacity"
              onClick={(e) => { e.stopPropagation(); removeSearch(s.id); }}
            />
          </button>
        ))}
      </div>
    )}
  </>
  );

  const propertyList = (
    <div role="feed" aria-label="Property listings" className={isMobile ? "space-y-3" : "grid grid-cols-2 gap-4"}>
      {isSearching ? (
        [0, 1, 2].map(i => <PropertyCardSkeleton key={i} />)
      ) : (
        <>
          {filteredProperties.map((property, i) => (
            <div key={property.id} ref={el => { if (el) cardRefs.current.set(property.id, el); }}>
              <PropertyCard
                property={property}
                onSelect={(p) => {
                  handleSelectProperty(p);
                  if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
                }}
                isSaved={isSaved(property.id)}
                onToggleSave={toggleSaved}
                index={i}
              />
            </div>
          ))}
          {filteredProperties.length === 0 && (
            <div className="text-center py-8 col-span-2">
              <p className="text-sm text-muted-foreground">
                {areaSearch ? 'No properties in this area.' : 'No properties found.'}
              </p>
              {(areaSearch || searchRadius) && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Some properties may be hidden because they don't have map coordinates yet.
                </p>
              )}
              {areaSearch && (
                <button
                  onClick={() => handleAreaSearch(null)}
                  className="mt-3 text-xs text-primary font-medium hover:underline"
                >
                  Clear area filter
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const mapComponent = (
    <MapErrorBoundary>
      <PropertyMap
        properties={filteredProperties}
        onPropertySelect={handleSelectProperty}
        selectedPropertyId={selectedProperty?.id}
        onAreaSearch={handleAreaSearch}
        centerOn={mapCenter}
        onScrollToProperty={scrollToProperty}
        formatPrice={formatPrice}
      />
    </MapErrorBoundary>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <VoiceSearchErrorBoundary>
        <VoiceSearchHero
          onSearch={handleSearch}
          onLocationSelect={(loc) => {
            console.log('[Index] Location selected:', loc);
            setMapCenter({ lat: loc.lat, lng: loc.lng, key: `${loc.lat}-${loc.lng}` });
            setSearchCenter({ lat: loc.lat, lng: loc.lng });
            setMapCollapsed(false);
          }}
          onRadiusChange={setSearchRadius}
          selectedRadius={searchRadius}
          resultCount={hasSearched ? filteredProperties.length : undefined}
          isSearching={isSearching}
        />
      </VoiceSearchErrorBoundary>

      {/* Desktop layout */}
      {!isMobile ? (
        <div className="flex-1 flex flex-col px-4 py-4 gap-4 max-w-7xl mx-auto w-full">
          {/* Collapsible map card */}
          <div className="relative">
            <button
              onClick={() => setMapCollapsed(c => !c)}
              aria-expanded={!mapCollapsed}
              aria-label="Toggle map view"
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
        <div className="flex-1 relative" style={{ height: `calc(${viewportHeight}px - 250px)` }}>
          {mobileView === 'map' ? (
            <>
              <div className="absolute inset-0">{mapComponent}</div>
              <motion.div
                className="absolute bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl shadow-drawer border-t border-border"
                style={{ height: sheetHeightSpring, paddingBottom: 'env(safe-area-inset-bottom)' }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.1}
                onDrag={(_, info) => {
                  const newH = viewportHeight * SNAP_POINTS[sheetSnap] - info.offset.y;
                  sheetHeightMV.set(Math.max(viewportHeight * 0.15, Math.min(viewportHeight * 0.9, newH)));
                }}
                onDragEnd={handleSheetDragEnd}
              >
                <div className="w-full flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
                  <div className="w-10 h-1.5 rounded-full bg-muted" />
                </div>
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
                <div className="overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" style={{ maxHeight: 'calc(100% - 3.75rem)' }}>
                  {propertyList}
                </div>
              </motion.div>
              <motion.button
                onClick={() => {
                  const hero = document.querySelector('[aria-label="Start voice search"]') as HTMLButtonElement;
                  if (hero) { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => hero.click(), 500); }
                }}
                style={{ bottom: sheetHeightSpring, marginBottom: 20, paddingBottom: 'env(safe-area-inset-bottom)' }}
                className="absolute right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center"
              >
                <Mic size={22} />
              </motion.button>
            </>
          ) : (
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
                  <button onClick={() => setMobileView('map')} aria-label="Show map view" className="flex items-center gap-1.5 text-xs text-primary font-medium">
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
        searchContext={searchContextForLead}
      />
      <SiteFooter />
      <BottomNav />
    </div>
  );
};

export default Index;
