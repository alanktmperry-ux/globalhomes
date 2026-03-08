import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Loader2, Zap, Map, List } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardSkeleton } from '@/components/PropertyCardSkeleton';
import { PropertyDrawer } from '@/components/PropertyDrawer';
import { PropertyMap } from '@/components/PropertyMap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useIsMobile } from '@/hooks/use-mobile';
import { manusSearch } from '@/lib/ManusSearchService';
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

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

  const [results, setResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [manusStatus, setManusStatus] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setManusStatus(null);
    addSearch(query);
    manusSearch.cancelPolling();

    try {
      console.log('[Search] Starting search for:', query);
      const result = await manusSearch.search({ query }, (update) => {
        console.log('[Search] Update:', update.status, 'properties:', update.properties?.length);
        setManusStatus(update.status);
        if (update.status === 'completed' && update.properties && update.properties.length > 0) {
          setResults(update.properties);
          toast({
            title: '🔍 Live results ready',
            description: `Found ${update.properties.length} properties from real estate sites`,
          });
        } else if (update.status === 'failed') {
          setManusStatus(null);
        }
      });
      console.log('[Search] Mock result:', result.properties.length, 'properties');
      setResults(result.properties);
    } catch (err) {
      console.error('[Search] Error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addSearch, toast]);

  const displayProperties = hasSearched ? results : mockProperties.slice(0, 6);

  const filteredProperties = useMemo(() => {
    if (!areaSearch) return displayProperties;
    return displayProperties.filter((p) => {
      if (!p.lat || !p.lng) return false;
      if (areaSearch.type === 'circle') {
        return haversineDistance(p.lat, p.lng, areaSearch.center[0], areaSearch.center[1]) <= areaSearch.radius;
      }
      return isInsidePolygon(p.lat, p.lng, areaSearch.coordinates);
    });
  }, [displayProperties, areaSearch]);

  const handleAreaSearch = useCallback((area: AreaSearch | null) => {
    setAreaSearch(area || null);
  }, []);

  const propertyList = (
    <div className="space-y-4">
      {isSearching ? (
        [0, 1, 2].map(i => <PropertyCardSkeleton key={i} />)
      ) : (
        <>
          {filteredProperties.map((property, i) => (
            <PropertyCard
              key={property.id}
              property={property}
              onSelect={setSelectedProperty}
              isSaved={isSaved(property.id)}
              onToggleSave={toggleSaved}
              index={i}
            />
          ))}
          {filteredProperties.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {areaSearch ? 'No properties in this area. Try adjusting your search boundary.' : 'No properties found. Try a different search.'}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
              {t('app.name')}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium transition-colors hover:bg-accent"
              >
                {showMap ? <List size={16} /> : <Map size={16} />}
                <span className="hidden sm:inline">{showMap ? 'List only' : 'Show map'}</span>
              </button>
              <LanguageSwitcher />
            </div>
          </div>
          <SearchBar onSearch={handleSearch} onLocationSelect={(loc) => {
            // Could be used to center map in future
            console.log('Location selected:', loc);
          }} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Resume search */}
        <AnimatePresence>
          {lastSearch && !hasSearched && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => handleSearch(lastSearch.text)}
              className="w-full flex items-center gap-3 p-4 mb-5 rounded-2xl bg-primary/5 border border-primary/10 text-left transition-colors active:bg-primary/10"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('search.resume')}</p>
                <p className="text-sm text-foreground font-medium truncate mt-0.5">
                  {lastSearch.location ? `Back to ${lastSearch.location}` : lastSearch.text}
                </p>
              </div>
              <ArrowRight size={18} className="text-primary shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Status bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasSearched ? (
              <h2 className="font-display font-semibold text-foreground">{t('search.results')}</h2>
            ) : (
              <>
                <Sparkles size={16} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">{t('search.recommended')}</h2>
              </>
            )}
            {areaSearch && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {areaSearch.type === 'circle' ? `${Math.round(areaSearch.radius / 1000)}km radius` : 'Custom area'}
              </span>
            )}
          </div>
          {manusStatus && (manusStatus === 'running' || manusStatus === 'pending') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-xs text-primary font-medium"
            >
              <Loader2 size={12} className="animate-spin" />
              <span>Searching live sites…</span>
            </motion.div>
          )}
          {manusStatus === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-emerald-600 font-medium"
            >
              <Zap size={12} />
              <span>Live results</span>
            </motion.div>
          )}
        </div>

        {/* Split view */}
        {showMap && !isMobile ? (
          <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="w-[420px] shrink-0 overflow-y-auto pr-2 scrollbar-thin">
              {propertyList}
            </div>
            <div className="flex-1 min-w-0">
              <PropertyMap
                properties={filteredProperties}
                onPropertySelect={setSelectedProperty}
                selectedPropertyId={selectedProperty?.id}
                onAreaSearch={handleAreaSearch}
              />
            </div>
          </div>
        ) : showMap && isMobile ? (
          <div className="space-y-4">
            <div className="h-[300px]">
              <PropertyMap
                properties={filteredProperties}
                onPropertySelect={setSelectedProperty}
                selectedPropertyId={selectedProperty?.id}
                onAreaSearch={handleAreaSearch}
              />
            </div>
            {propertyList}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            {propertyList}
          </div>
        )}
      </main>

      <PropertyDrawer
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? isSaved(selectedProperty.id) : false}
        onToggleSave={toggleSaved}
      />
      <BottomNav />
    </div>
  );
};

export default Index;
