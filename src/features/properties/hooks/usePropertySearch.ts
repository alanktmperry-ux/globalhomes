import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Property } from '@/shared/lib/types';

import { manusSearch } from '@/features/properties/api/ManusSearchService';
import { Filters, defaultFilters } from '@/shared/components/FilterSidebar';
import { firecrawlPropertySearch } from '@/features/properties/api/firecrawlPropertySearch';
import { searchAgentListings } from '@/features/properties/api/fetchPublicProperties';
import { toast } from 'sonner';
import { isInsidePolygon, haversineDistance } from '@/shared/lib/geoUtils';
import { useRealtimeProperties } from './useRealtimeProperties';
import { useCurrency, ListingMode } from '@/shared/lib/CurrencyContext';

// ── AI search cache (localStorage, 24h TTL) ──────────────────
const AI_CACHE_PREFIX = 'ai_search_';
const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedAIResults(query: string): Property[] | null {
  try {
    const key = AI_CACHE_PREFIX + btoa(encodeURIComponent(query.toLowerCase().trim()));
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > AI_CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data as Property[];
  } catch {
    return null;
  }
}

function setCachedAIResults(query: string, data: Property[]): void {
  try {
    const key = AI_CACHE_PREFIX + btoa(encodeURIComponent(query.toLowerCase().trim()));
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — ignore */ }
}

// ── Types ────────────────────────────────────────────────────

export type AreaSearch =
  | { type: 'circle'; center: [number, number]; radius: number }
  | { type: 'polygon'; coordinates: [number, number][] };

// ── Hook ─────────────────────────────────────────────────────

export interface UsePropertySearchOptions {
  addSearch: (q: string) => void;
}

export function usePropertySearch({ addSearch }: UsePropertySearchOptions) {
  const { listingMode } = useCurrency();

  // ── Filters & sort (internalized) ────────────────────────────
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'beds'>('default');

  // ── Internal state ───────────────────────────────────────────
  const [results, setResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [manusStatus, setManusStatus] = useState<string | null>(null);
  const [manusFailed, setManusFailed] = useState(false);
  const [usingCachedAI, setUsingCachedAI] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(5);
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);

  // ── Realtime properties with React Query caching ─────────────
  const {
    properties: dbProperties,
    isLoading: dbLoading,
    error: dbError,
  } = useRealtimeProperties({
    limit: 50,
    nearbyCenter: searchCenter,
    nearbyRadiusKm: searchRadius,
    listingType: listingMode,
  });

  // ── Search handler (with stale-while-revalidate caching) ─────
  const handleSearch = useCallback(
    async (query: string, forceRefresh = false) => {
      setHasSearched(true);
      setManusStatus(null);
      setManusFailed(false);
      setUsingCachedAI(false);
      setCurrentQuery(query);
      addSearch(query);
      manusSearch.cancelPolling();

      // Serve cached AI results immediately if available
      const cached = !forceRefresh ? getCachedAIResults(query) : null;
      if (cached && cached.length > 0) {
        setResults(cached);
        setUsingCachedAI(true);
        // Don't show loading state — we have data
      }

      setIsSearching(!cached);

      // Phase 1 (agent listings) + Phase 2 (Firecrawl) in parallel
      const agentListingsPromise = searchAgentListings(query, 20, listingMode).catch((err) => {
        console.warn('[handleSearch] Agent listings search failed:', err);
        return [] as Property[];
      });

      const firecrawlPromise = firecrawlPropertySearch(query, 8).catch((err) => {
        console.warn('[handleSearch] Firecrawl search failed:', err);
        return [] as Property[];
      });

      // Show agent listings immediately when ready (revenue priority)
      agentListingsPromise.then((agentResults) => {
        if (agentResults.length > 0) {
          setResults((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const unique = agentResults.filter((p) => !ids.has(p.id));
            if (unique.length === 0) return prev;
            // Agent listings prepended — always first
            return [...unique, ...prev];
          });
        }
      });

      try {
        const result = await manusSearch.search({ query }, (update) => {
          setManusStatus(update.status);
          if (update.status === 'completed' && update.properties && update.properties.length > 0) {
            setResults((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              const unique = update.properties!.filter((p) => !ids.has(p.id));
              const merged = [...prev, ...unique];
              setCachedAIResults(query, merged);
              return merged;
            });
            setUsingCachedAI(false);
            toast.success(`🔍 Live results ready — Found ${update.properties.length} properties`);
          } else if (update.status === 'failed') {
            setManusStatus(null);
            setManusFailed(true);
            if (!cached) {
              toast.success('⚠️ AI search paused — Showing cached results. Try refreshing later.');
            }
          }
        });
        if (result.properties.length > 0) {
          setResults((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const unique = result.properties.filter((p) => !ids.has(p.id));
            return [...prev, ...unique];
          });
          setUsingCachedAI(false);
        }
      } catch (err) {
        console.error('[handleSearch] AI search failed:', err);
        if (!cached || cached.length === 0) {
          // Keep any Firecrawl results that may have already been set
        }
        setManusFailed(true);
        toast('⚠️ AI search paused — ' + (cached ? 'Showing cached results from earlier.' : 'Showing web results instead.'));
        if (cached) setUsingCachedAI(true);
      }

      // Merge Firecrawl results
      const firecrawlResults = await firecrawlPromise;
      if (firecrawlResults.length > 0) {
        setResults((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const unique = firecrawlResults.filter((p) => !ids.has(p.id));
          if (unique.length === 0) return prev;
          const merged = [...prev, ...unique];
          setCachedAIResults(query, merged);
          return merged;
        });
        if (!cached) {
          toast.success(`🌐 Web results found — Found ${firecrawlResults.length} listings from the web`);
        }
      }

      setIsSearching(false);
    },
    [addSearch, toast, listingMode],
  );

  // ── Re-trigger search when listing mode changes ──────────────
  const prevListingMode = useRef(listingMode);
  useEffect(() => {
    if (prevListingMode.current !== listingMode) {
      prevListingMode.current = listingMode;
      setResults([]);
      if (currentQuery) {
        handleSearch(currentQuery);
      }
    }
  }, [listingMode, currentQuery, handleSearch]);

  // ── Force-refresh AI results ─────────────────────────────────
  const refreshAIResults = useCallback(() => {
    if (currentQuery) handleSearch(currentQuery, true);
  }, [currentQuery, handleSearch]);

  // ── Derived: all properties (DB + mock fallback) ─────────────
  const allProperties = useMemo(() => {
    return [...dbProperties];
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

    // Radius filter — server-side RPC handles DB properties when center+radius set,
    // but we still need client-side filtering for mock/AI results
    if (searchCenter && searchRadius) {
      props = props.filter((p) => {
        if (p.lat && p.lng) {
          const dist = haversineDistance(p.lat, p.lng, searchCenter.lat, searchCenter.lng);
          return dist <= searchRadius;
        }
        return false;
      });
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

    // Listing mode filter (sale vs rent)
    props = props.filter((p) => {
      if (listingMode === 'rent') return p.listingType === 'rent';
      // sale mode: show sale or unset
      return !p.listingType || p.listingType === 'sale';
    });

    // Advanced filters
    props = props.filter((p) => {
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(p.propertyType)) return false;
      if (p.beds < filters.minBeds) return false;
      if (p.baths < filters.minBaths) return false;
      if (p.parking < filters.minParking) return false;
      if (filters.features.length > 0 && !filters.features.every((f) => p.features.some((pf) => pf.toLowerCase().includes(f.toLowerCase())))) return false;

      // Pet friendly — match against features
      if (filters.petFriendly && !p.features.some((f) => /pet|animal|dog|cat/i.test(f))) return false;

      // Furnished — match against features
      if (filters.furnished && !p.features.some((f) => /furnish/i.test(f))) return false;

      // First home buyer — price threshold (VIC/NSW ≤ $800k)
      if (filters.firstHomeBuyer && p.price > 800_000) return false;

      // School zone — match against aiHighlights or features
      if (filters.schoolZone) {
        const zone = filters.schoolZone.toLowerCase().replace(/-/g, ' ');
        const searchable = [...p.features, ...(p.aiHighlights || []), p.description || ''].join(' ').toLowerCase();
        if (!searchable.includes(zone) && !searchable.includes('school')) return false;
      }

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
  }, [displayProperties, areaSearch, sortBy, filters, searchCenter, searchRadius, listingMode]);

  // ── Setters ──────────────────────────────────────────────────
  const handleAreaSearch = useCallback((area: AreaSearch | null) => {
    setAreaSearch(area || null);
  }, []);

  const handleSetSearchRadius = useCallback((radius: number | null) => {
    setSearchRadius(radius);
    if (radius && !searchCenter) {
      console.warn('[RadiusFilter] Radius set but no search center.');
      toast.success('📍 Select a location first — Pick a location from the suggestions so the radius filter knows where to search from.');
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
    refreshAIResults,
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius: handleSetSearchRadius,
    clearSearchRadius,

    // Flat state
    isSearching,
    hasSearched,
    manusStatus,
    manusFailed,
    usingCachedAI,
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
