import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useMotionValue, useSpring, PanInfo } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Map, List, Mic, GripVertical, ArrowUpDown, X, Bookmark, Share2, Users } from 'lucide-react';
import { VoiceSearchHero } from '@/features/search/components/VoiceSearchHero';

import { VirtualizedPropertyList } from '@/features/properties/components/VirtualizedPropertyList';
import { MapSkeleton } from '@/features/properties/components/PropertyCardSkeleton';
import { PropertyDrawer } from '@/features/properties/components/PropertyDrawer';
import { MapErrorBoundary } from '@/features/properties/components/MapErrorBoundary';
import { VoiceSearchErrorBoundary } from '@/features/search/components/VoiceSearchErrorBoundary';
import { useI18n } from '@/shared/lib/i18n';

// Lazy-load map — only initialize when needed
const LazyPropertyMap = lazy(() => import('@/features/properties/components/PropertyMap').then(m => ({ default: m.PropertyMap })));
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Property } from '@/shared/lib/types';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { FilterSidebar } from '@/shared/components/FilterSidebar';
import { usePropertySearch } from '@/features/properties/hooks/usePropertySearch';
import { Slider } from '@/components/ui/slider';
import { useSavedSearches } from '@/features/search/hooks/useSavedSearches';
import { useCollabSession } from '@/features/search/hooks/useCollabSession';
import { useAuth } from '@/features/auth/AuthProvider';
import ConsumerSignUpModal from '@/features/search/components/ConsumerSignUpModal';
import { supabase } from '@/integrations/supabase/client';
import { geocode } from '@/shared/lib/googleMapsService';

const Index = () => {
  const { t } = useI18n();
  const { addSearch, lastSearch } = useSearchHistory();
  const { savedIds, isSaved, toggleSaved } = useSavedProperties();
  const isMobile = useIsMobile();
  const { formatPrice, listingMode } = useCurrency();
  const { savedSearches, saveSearch, removeSearch } = useSavedSearches();
  const { user } = useAuth();
  const {
    isCollab,
    createSession,
    toggleReaction,
    trackView,
    getPropertyReactions,
    hasPartnerViewed,
    syncSelectedProperty,
  } = useCollabSession();

  const [showConsumerModal, setShowConsumerModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const viewedPropertiesRef = useRef(new Set<string>());
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const sessionStartRef = useRef(Date.now());
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; key?: number | string } | null>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
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
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius,
    clearSearchRadius,
    isSearching,
    hasSearched,
    currentQuery,
    searchRadius,
    searchCenter,
    areaSearch,
    sortBy,
    setSortBy,
    filters,
    setFilters,
    searchSummary,
  } = usePropertySearch({ addSearch });

  // Consumer sign-up modal trigger after 3rd anonymous search
  const wrappedHandleSearch = useCallback((query: string) => {
    handleSearch(query);

    // Fire-and-forget: log every search to voice_searches for AI Buyer Concierge pipeline
    supabase
      .from('voice_searches')
      .insert({
        transcript: query.slice(0, 200),
        user_id: user?.id ?? null,
        detected_language: 'en',
        status: 'completed',
      })
      .then(() => {});

    if (!user) {
      const alreadySignedUp = localStorage.getItem('listhq_consumer_signed_up');
      if (alreadySignedUp) return;
      const dismissed = localStorage.getItem('listhq_consumer_dismissed');
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
      const count = Number(localStorage.getItem('listhq_search_count') || '0') + 1;
      localStorage.setItem('listhq_search_count', String(count));
      if (count >= 3) setShowConsumerModal(true);
    }

    // Geocode the typed search text and pan the map to the result
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      const locationCandidates = Array.from(new Set([
        trimmedQuery,
        trimmedQuery
          .replace(/\b\d+\s*(?:bed(?:room)?s?|bath(?:room)?s?|car(?:space)?s?|parking)\b/gi, ' ')
          .replace(/\$\s*[\d,.]+(?:\s?[mk])?/gi, ' ')
          .replace(/\b(?:house|apartment|unit|townhouse|villa|duplex|studio|rent|rental|sale|buy|looking|for|with|under|over|between|in|near|around)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      ].filter(Boolean)));

      void (async () => {
        for (const candidate of locationCandidates) {
          const locationQuery = candidate.toLowerCase().includes('australia')
            ? candidate
            : `${candidate}, Australia`;

          try {
            const coords = await geocode(locationQuery);
            if (!coords) continue;

            setSearchCenter(coords);
            setMapCenter({
              lat: coords.lat,
              lng: coords.lng,
              key: `geocode-${coords.lat}-${coords.lng}-${Date.now()}`,
            });
            setMapExpanded(false);
            return;
          } catch {
            // Try the next candidate silently
          }
        }
      })();
    }
  }, [handleSearch, setSearchCenter, user]);

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

  // ── Reset map center when listing mode toggled ───────────────
  useEffect(() => {
    const handler = () => setMapCenter(null);
    window.addEventListener('listing-mode-changed', handler);
    return () => window.removeEventListener('listing-mode-changed', handler);
  }, []);

  // Auto-centre map when search resolves a location
  useEffect(() => {
    if (searchCenter) {
      setMapCenter({
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        key: `search-${searchCenter.lat}-${searchCenter.lng}-${Date.now()}`,
      });
    }
  }, [searchCenter]);

  // Fetch featured/boosted listings
  useEffect(() => {
    supabase
      .from('properties')
      .select('id, title, address, suburb, state, price, price_formatted, images, image_url, property_type, beds, baths, parking, lat, lng, boost_tier, is_featured, listing_type')
      .eq('is_active', true)
      .or('is_featured.eq.true,boost_tier.not.is.null')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) setFeaturedListings(data);
      });
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
      else setSearchRadius(5);
      if (location) handleSearch(location);

      initializedFromUrl.current = true;
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleSearch, setFilters, setSortBy, setSearchRadius, clearSearchRadius]);

  // ── Track property views for lead scoring ─────────────────────
  const handleSelectProperty = useCallback((p: Property | null) => {
    if (p) {
      viewedPropertiesRef.current.add(p.id);
      setViewedIds(prev => {
        if (prev.has(p.id)) return prev;
        const next = new Set(prev);
        next.add(p.id);
        return next;
      });
      trackView(p.id);
      syncSelectedProperty(p?.id ?? null);
    }
    setSelectedProperty(p);
  }, [trackView, syncSelectedProperty]);

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

  const pageTitle = `${currentQuery || 'Melbourne'} Property Search | ListHQ`;
  const pageDescription = `Search ${currentQuery || 'Melbourne'} properties. ${filteredProperties.length} listings. Save searches. Get investor alerts.`;

  const statusBar = (
    <>
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
      <meta property="og:image" content="/placeholder.svg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <link rel="canonical" href={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''} />
    </Helmet>
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground shrink-0">
          {filteredProperties.length} properties
        </span>
        {hasSearched && searchSummary && (
          <span className="text-xs text-primary font-medium truncate max-w-[300px]" title={searchSummary}>
            {searchSummary}
          </span>
        )}
        {hasSearched && !searchSummary && (
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
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Collab button */}
        {!isCollab && user && (
          <button
            onClick={() => createSession({
              query: currentQuery || '',
              filters: filters as Record<string, any>,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Users size={12} />
            Search together
          </button>
        )}
        {isCollab && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shrink-0">
            <Users size={12} />
            Collab active
          </span>
        )}
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
          listingMode={listingMode}
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
          <div key={s.id} className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleSearch(s.query)}
              className="group flex items-center gap-1 px-2.5 py-1 rounded-l-full bg-secondary border border-r-0 border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Bookmark size={10} className="text-primary" />
              <span className="max-w-[120px] truncate">{s.label}</span>
              <X
                size={10}
                className="opacity-0 group-hover:opacity-60 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeSearch(s.id); }}
              />
            </button>
            <button
              onClick={() => createSession({
                query: s.query,
                filters: s.filters as Record<string, any>,
                center: s.center,
              })}
              className="px-1.5 py-1 rounded-r-full bg-secondary border border-l-0 border-border text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              title="Share this search"
            >
              <Share2 size={10} />
            </button>
          </div>
        ))}
        {isCollab && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0 animate-fade-in">
            <Users size={12} />
            Searching together
          </div>
        )}
      </div>
    )}
  </>
  );

  const emptyPlaceholder = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <MapPin size={28} className="text-primary" />
      </div>
      <h2 className="text-lg font-display font-bold text-foreground mb-1.5 text-center">
        Properties coming soon
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Agents are setting up their listings. Check back shortly!
      </p>
    </motion.div>
  );

  const showEmptyState = filteredProperties.length === 0 && !isSearching && !hasSearched;

  const propertyList = showEmptyState ? emptyPlaceholder : (
    <VirtualizedPropertyList
      properties={filteredProperties}
      isSearching={isSearching}
      isMobile={isMobile}
      isSaved={isSaved}
      onToggleSave={toggleSaved}
      onSelect={(p) => {
        handleSelectProperty(p);
        if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
      }}
      cardRefs={cardRefs}
      isCollab={isCollab}
      getPropertyReactions={isCollab ? getPropertyReactions : undefined}
      onToggleReaction={isCollab ? toggleReaction : undefined}
      hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
      currentUserId={user?.id}
      areaSearch={areaSearch}
      searchRadius={searchRadius}
      onClearAreaSearch={() => handleAreaSearch(null)}
      listingMode={listingMode}
    />
  );

  const mapComponent = isSearching ? (
    <MapSkeleton />
  ) : (
    <MapErrorBoundary>
      <Suspense fallback={<MapSkeleton />}>
        <LazyPropertyMap
          properties={filteredProperties}
          onPropertySelect={handleSelectProperty}
          selectedPropertyId={selectedProperty?.id}
          onAreaSearch={handleAreaSearch}
          centerOn={mapCenter}
          onScrollToProperty={scrollToProperty}
          formatPrice={formatPrice}
          onMapMoved={(bounds) => {
            handleAreaSearch({
              type: 'polygon',
              coordinates: [
                [bounds.north, bounds.west],
                [bounds.north, bounds.east],
                [bounds.south, bounds.east],
                [bounds.south, bounds.west],
                [bounds.north, bounds.west],
              ],
            });
          }}
          onGeolocate={(loc) => {
            setSearchCenter({ lat: loc.lat, lng: loc.lng });
            if (!searchRadius) setSearchRadius(10);
            setTimeout(() => {
              setMapCenter({ lat: loc.lat, lng: loc.lng, key: `geo-${Date.now()}` });
            }, 100);
          }}
        />
      </Suspense>
    </MapErrorBoundary>
  );

  return (
    <div className="flex flex-col bg-background min-h-screen">
    {/* ── Top: Voice Search Bar ─────────────────────────────── */}
    <div>
        <VoiceSearchErrorBoundary>
          <VoiceSearchHero
            onSearch={wrappedHandleSearch}
            onLocationSelect={(loc) => {
              setSearchCenter({ lat: loc.lat, lng: loc.lng });
              if (!searchRadius) setSearchRadius(10);
              setTimeout(() => {
                setMapCenter({ lat: loc.lat, lng: loc.lng, key: `${loc.lat}-${loc.lng}-${Date.now()}` });
              }, 300);
            }}
            onRadiusChange={setSearchRadius}
            selectedRadius={searchRadius}
            resultCount={hasSearched ? filteredProperties.length : undefined}
            isSearching={isSearching}
          />
        </VoiceSearchErrorBoundary>
      </div>

    {/* ── Desktop: Zillow-style split ────────────────────────── */}
    {!isMobile ? (
      <div
        className="flex overflow-hidden flex-1 min-h-0"
        style={{ height: 'calc(100vh - 56px)' }}
      >
          {/* LEFT: fixed map panel */}
          <div
            className="relative overflow-hidden"
            style={{
              width: `${mapExpanded ? 85 : splitPercent}%`,
              transition: 'width 0.3s ease',
            }}
          >
            {/* Expand/collapse toggle — sits on right edge of map */}
            <button
              onClick={() => setMapExpanded(e => !e)}
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-elevated text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              {mapExpanded ? (
                <><ArrowRight size={12} className="rotate-180" /> Collapse</>
              ) : (
                <><ArrowRight size={12} className="rotate-0" /> Expand map</>
              )}
            </button>
            {mapComponent}
          </div>

          {/* Draggable divider */}
          {!mapExpanded && (
            <div
              className="w-1 cursor-col-resize bg-border hover:bg-primary/30 transition-colors shrink-0 flex items-center justify-center group"
              onMouseDown={handleMouseDown}
            >
              <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-primary/60" />
            </div>
          )}

          {/* RIGHT: scrollable list panel */}
          <div
            className="flex flex-col overflow-y-auto border-l border-border bg-background"
            style={{
              width: `${mapExpanded ? 15 : 100 - splitPercent}%`,
              minWidth: mapExpanded ? 0 : 300,
              transition: 'width 0.3s ease',
            }}
          >
            {/* Featured/Boosted Listings Hero — shown only before search */}
            {!hasSearched && featuredListings.length > 0 && (
              <div className="px-4 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Featured Listings</span>
                </div>
                <div className="space-y-3">
                  {featuredListings.slice(0, 3).map((prop) => {
                    const img = (prop.images && prop.images[0]) || prop.image_url;
                    const isRent = prop.listing_type === 'rent' || prop.listing_type === 'rental';
                    return (
                      <div
                        key={prop.id}
                        className="group relative rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                        onClick={() => {
                          handleSelectProperty(prop as any);
                          if (prop.lat && prop.lng) setMapCenter({ lat: prop.lat, lng: prop.lng, key: `${prop.lat}-${prop.lng}` });
                        }}
                      >
                        <div className="relative h-40 bg-muted overflow-hidden">
                          {img ? (
                            <img src={img} alt={prop.title || prop.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <MapPin size={24} className="text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1.5">
                            {prop.boost_tier && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">Featured</span>
                            )}
                            {prop.is_featured && !prop.boost_tier && (
                              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow-sm">Premier</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                            <p className="text-white font-bold text-sm">{formatPrice(prop.price, prop.listing_type)}</p>
                            {isRent && <span className="text-white/80 text-[10px]">per week</span>}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 bg-card">
                          <p className="text-sm font-semibold text-foreground truncate">{prop.title || prop.address}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{prop.suburb}{prop.state ? `, ${prop.state}` : ''}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {prop.beds > 0 && <span>🛏 {prop.beds}</span>}
                            {prop.baths > 0 && <span>🛁 {prop.baths}</span>}
                            {prop.parking > 0 && <span>🚗 {prop.parking}</span>}
                            <span className="ml-auto text-[10px] capitalize text-muted-foreground/70">{prop.property_type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 mb-1 border-t border-border/50" />
              </div>
            )}

            {/* Status bar + filters */}
            <div className="px-4 py-2 shrink-0">
              {statusBar}
            </div>

            {/* Property list */}
            <div className="flex-1 px-4 pb-6">
              {showEmptyState ? emptyPlaceholder : (
                <VirtualizedPropertyList
                  properties={filteredProperties}
                  isSearching={isSearching}
                  isMobile={false}
                  isSaved={isSaved}
                  onToggleSave={toggleSaved}
                  onSelect={(p) => {
                    handleSelectProperty(p);
                    if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
                  }}
                  cardRefs={cardRefs}
                  isCollab={isCollab}
                  getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                  onToggleReaction={isCollab ? toggleReaction : undefined}
                  hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                  currentUserId={user?.id}
                  areaSearch={areaSearch}
                  searchRadius={searchRadius}
                  onClearAreaSearch={() => handleAreaSearch(null)}
                  listingMode={listingMode}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Mobile layout ────────────────────────────────────── */
        <div className="flex-1 relative overflow-hidden">
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
                    {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
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
                    <button onClick={() => setMobileView('list')} className="text-xs text-primary font-medium">
                      View list
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" style={{ maxHeight: 'calc(100% - 3.75rem)' }}>
                  {showEmptyState ? emptyPlaceholder : (
                    <VirtualizedPropertyList
                      properties={filteredProperties}
                      isSearching={isSearching}
                      isMobile={true}
                      isSaved={isSaved}
                      onToggleSave={toggleSaved}
                      onSelect={(p) => {
                        handleSelectProperty(p);
                        if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
                      }}
                      cardRefs={cardRefs}
                      isCollab={isCollab}
                      getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                      onToggleReaction={isCollab ? toggleReaction : undefined}
                      hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                      currentUserId={user?.id}
                      listingMode={listingMode}
                    />
                  )}
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
                  <FilterSidebar filters={filters} onChange={setFilters} isOpen={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} totalCount={displayProperties.length} filteredCount={filteredProperties.length} />
                  <button onClick={() => setMobileView('map')} aria-label="Show map view" className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Map size={14} /> Show map
                  </button>
                </div>
              </div>
              {showEmptyState ? emptyPlaceholder : (
                <VirtualizedPropertyList
                  properties={filteredProperties}
                  isSearching={isSearching}
                  isMobile={true}
                  isSaved={isSaved}
                  onToggleSave={toggleSaved}
                  onSelect={(p) => {
                    handleSelectProperty(p);
                    if (p.lat && p.lng) setMapCenter({ lat: p.lat, lng: p.lng, key: `${p.lat}-${p.lng}` });
                  }}
                  cardRefs={cardRefs}
                  isCollab={isCollab}
                  getPropertyReactions={isCollab ? getPropertyReactions : undefined}
                  onToggleReaction={isCollab ? toggleReaction : undefined}
                  hasPartnerViewed={isCollab ? hasPartnerViewed : undefined}
                  currentUserId={user?.id}
                  listingMode={listingMode}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Property drawer + modals */}
      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
        onToggleSave={toggleSaved}
        searchContext={searchContextForLead}
      />

      <ConsumerSignUpModal
        open={showConsumerModal}
        onOpenChange={setShowConsumerModal}
        lastQuery={currentQuery || lastSearch?.text || ''}
      />
    </div>
  );
};

export default Index;
