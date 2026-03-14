import { useState, useCallback, useMemo, useEffect } from 'react';
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mock-data';
import { manusSearch } from '@/lib/ManusSearchService';
import { Filters, defaultFilters } from '@/components/FilterSidebar';
import { useToast } from '@/hooks/use-toast';
import { isInsidePolygon, haversineDistance } from '@/shared/lib/geoUtils';
import { fetchPublicProperties } from '@/features/properties/api/fetchPublicProperties';

// ── Types ────────────────────────────────────────────────────

export type AreaSearch =
  | { type: 'circle'; center: [number, number]; radius: number }
  | { type: 'polygon'; coordinates: [number, number][] };

// ── Hook ─────────────────────────────────────────────────────

export interface UsePropertySearchOptions {
  addSearch: (q: string) => void;
}

export function usePropertySearch({ addSearch }: UsePropertySearchOptions) {
  const { toast } = useToast();

  // ── Filters & sort (internalized) ────────────────────────────
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'beds'>('default');

  // ── Internal state ───────────────────────────────────────────
  const [results, setResults] = useState<Property[]>([]);
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [manusStatus, setManusStatus] = useState<string | null>(null);
  const [manusFailed, setManusFailed] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // ── Fetch DB properties ──────────────────────────────────────
  useEffect(() => {
    const fetchDbProperties = async () => {
      setDbLoading(true);
      setDbError(null);
      const { data, error } = await supabase
        .from('properties')
        .select('*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)')
        .eq('status', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setDbError(error.message);
        setDbProperties([]);
      } else if (data && data.length > 0) {
        setDbProperties(data.map(mapDbProperty));
      }
      setDbLoading(false);
    };
    fetchDbProperties();
  }, []);

  // ── Search handler ───────────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string) => {
      setIsSearching(true);
      setHasSearched(true);
      setManusStatus(null);
      setManusFailed(false);
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
            setManusFailed(true);
          }
        });
        setResults(result.properties);
      } catch {
        setResults([]);
        setManusFailed(true);
      } finally {
        setIsSearching(false);
      }
    },
    [addSearch, toast],
  );

  // ── Derived: all properties (DB + mock fallback) ─────────────
  const allProperties = useMemo(() => {
    const dbIds = new Set(dbProperties.map((p) => p.id));
    const mockFiltered = mockProperties.slice(0, 6).filter((p) => !dbIds.has(p.id));
    return [...dbProperties, ...mockFiltered];
  }, [dbProperties]);

  // ── Derived: display properties ───────────────────────────────
  const displayProperties = useMemo(() => {
    if (!hasSearched) return allProperties;

    const queryWords = currentQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const matchingDbProps = dbProperties.filter((p) => {
      const searchable = `${p.title} ${p.address} ${p.suburb} ${p.state} ${p.country} ${p.propertyType} ${p.description}`.toLowerCase();
      return queryWords.some((word) => searchable.includes(word));
    });

    const seenIds = new Set(matchingDbProps.map((p) => p.id));
    const uniqueMockResults = results.filter((p) => !seenIds.has(p.id));
    return [...matchingDbProps, ...uniqueMockResults];
  }, [hasSearched, allProperties, results, dbProperties, currentQuery]);

  // ── Derived: filtered + sorted properties ────────────────────
  const filteredProperties = useMemo(() => {
    let props = displayProperties;

    // Radius filter (haversineDistance returns km)
    if (searchCenter && searchRadius) {
      console.log(`[RadiusFilter] Center: ${searchCenter.lat},${searchCenter.lng} | Radius: ${searchRadius}km | Props before: ${props.length}`);
      props = props.filter((p) => {
        if (p.lat && p.lng) {
          const dist = haversineDistance(p.lat, p.lng, searchCenter.lat, searchCenter.lng);
          return dist <= searchRadius;
        }
        return false;
      });
      console.log(`[RadiusFilter] Props after: ${props.length}`);
    } else if (searchRadius && !searchCenter) {
      console.warn('[RadiusFilter] Radius is set but no searchCenter — skipping radius filter');
    }

    // Area filter (map drawing)
    if (areaSearch) {
      props = props.filter((p) => {
        if (!p.lat || !p.lng) return false;
        if (areaSearch.type === 'circle') {
          return haversineDistance(p.lat, p.lng, areaSearch.center[0], areaSearch.center[1]) <= areaSearch.radius / 1000;
        }
        return isInsidePolygon(p.lat, p.lng, areaSearch.coordinates);
      });
    }

    // Advanced filters
    props = props.filter((p) => {
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(p.propertyType)) return false;
      if (p.beds < filters.minBeds) return false;
      if (p.baths < filters.minBaths) return false;
      if (p.parking < filters.minParking) return false;
      if (filters.features.length > 0 && !filters.features.every((f) => p.features.some((pf) => pf.toLowerCase().includes(f.toLowerCase())))) return false;
      return true;
    });

    // Sort — subscribed agents get a subtle boost
    const subscriptionBoost = (p: Property) => (p.agent.isSubscribed ? 0 : 1);
    const withBoost = (compareFn: (a: Property, b: Property) => number) =>
      [...props].sort((a, b) => compareFn(a, b) || subscriptionBoost(a) - subscriptionBoost(b));

    if (sortBy === 'price-asc') return withBoost((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return withBoost((a, b) => b.price - a.price);
    if (sortBy === 'newest') return withBoost((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    if (sortBy === 'beds') return withBoost((a, b) => b.beds - a.beds);

    return [...props].sort((a, b) => subscriptionBoost(a) - subscriptionBoost(b));
  }, [displayProperties, areaSearch, sortBy, filters, searchCenter, searchRadius]);

  // ── Setters ──────────────────────────────────────────────────
  const handleAreaSearch = useCallback((area: AreaSearch | null) => {
    setAreaSearch(area || null);
  }, []);

  const handleSetSearchRadius = useCallback((radius: number | null) => {
    setSearchRadius(radius);
    if (radius && !searchCenter) {
      console.warn('[RadiusFilter] Radius set but no search center.');
      toast({
        title: '📍 Select a location first',
        description: 'Pick a location from the suggestions so the radius filter knows where to search from.',
      });
    }
  }, [searchCenter, toast]);

  const clearSearchRadius = useCallback(() => setSearchRadius(null), []);

  // ── Derived: unique agents from DB listings ───────────────────
  const agents = useMemo(() => {
    const byId = new Map<string, Property['agent']>();
    dbProperties.forEach(p => {
      if (p.agent.id && !byId.has(p.agent.id)) {
        byId.set(p.agent.id, p.agent);
      }
    });
    return Array.from(byId.values());
  }, [dbProperties]);

  // ── Return (flat) ────────────────────────────────────────────
  return {
    // Data
    agents,
    displayProperties,
    filteredProperties,

    // Actions
    handleSearch,
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius: handleSetSearchRadius,
    clearSearchRadius,

    // Flat state
    isSearching,
    hasSearched,
    manusStatus,
    manusFailed,
    currentQuery,
    searchCenter,
    searchRadius,
    areaSearch,
    dbLoading,
    dbError,

    // Internalized filters & sort
    filters,
    setFilters,
    sortBy,
    setSortBy,
  };
}
