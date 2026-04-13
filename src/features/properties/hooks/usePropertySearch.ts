import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { geocode } from '@/shared/lib/googleMapsService';
import { Property } from '@/shared/lib/types';

import { Filters, defaultFilters } from '@/shared/components/FilterSidebar';
import { firecrawlPropertySearch } from '@/features/properties/api/firecrawlPropertySearch';
import { searchAgentListings } from '@/features/properties/api/fetchPublicProperties';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { toast } from 'sonner';
import { parsePropertyQuery } from '@/features/search/lib/parsePropertyQuery';
import { isInsidePolygon, haversineDistance } from '@/shared/lib/geoUtils';
import { useRealtimeProperties } from './useRealtimeProperties';
import { useCurrency, ListingMode } from '@/shared/lib/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';


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
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(5);
  const [areaSearch, setAreaSearch] = useState<AreaSearch | null>(null);
  const [searchSummary, setSearchSummary] = useState<string>('');
  const [searchSuburb, setSearchSuburb] = useState<string | null>(null);

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
    suburb: searchSuburb,
  });

  // ── Build human-readable summary from parsed intent ─────────
  const buildSearchSummary = useCallback((intent: Record<string, unknown>): string => {
    const parts: string[] = [];
    if (intent.property_type) parts.push(String(intent.property_type));
    if (intent.suburb) parts.push(`in ${intent.suburb}`);
    if (intent.state) parts.push(String(intent.state));
    if (intent.price_min && intent.price_max) {
      const fmtMin = Number(intent.price_min) >= 1_000_000
        ? `$${(Number(intent.price_min) / 1_000_000).toFixed(1)}M`
        : `$${(Number(intent.price_min) / 1000).toFixed(0)}k`;
      const fmtMax = Number(intent.price_max) >= 1_000_000
        ? `$${(Number(intent.price_max) / 1_000_000).toFixed(1)}M`
        : `$${(Number(intent.price_max) / 1000).toFixed(0)}k`;
      parts.push(`${fmtMin}–${fmtMax}`);
    } else if (intent.price_max) {
      const fmt = Number(intent.price_max) >= 1_000_000
        ? `$${(Number(intent.price_max) / 1_000_000).toFixed(1)}M`
        : `$${(Number(intent.price_max) / 1000).toFixed(0)}k`;
      parts.push(`under ${fmt}`);
    } else if (intent.price_min) {
      const fmt = Number(intent.price_min) >= 1_000_000
        ? `$${(Number(intent.price_min) / 1_000_000).toFixed(1)}M`
        : `$${(Number(intent.price_min) / 1000).toFixed(0)}k`;
      parts.push(`from ${fmt}`);
    }
    if (intent.bedrooms_min) parts.push(`${intent.bedrooms_min}+ bed`);
    if (intent.bathrooms_min) parts.push(`${intent.bathrooms_min}+ bath`);
    return parts.length > 0 ? `Showing ${parts.join(' · ')}` : '';
  }, []);

  // ── Search handler ────────────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string) => {
      setHasSearched(true);
      setCurrentQuery(query);
      setResults([]);
      addSearch(query);
      setSearchSummary('');
      setSearchSuburb(null);

      // Parse structured filters from the query (local fallback)
      const parsedFilters = parsePropertyQuery(query);

      // Update the filter sidebar to reflect what was spoken/typed
      setFilters(prev => ({
        ...prev,
        minBeds: parsedFilters.beds || prev.minBeds,
        minBaths: prev.minBaths,
        priceRange: [
          parsedFilters.priceMin || prev.priceRange[0],
          parsedFilters.priceMax || prev.priceRange[1],
        ],
        propertyTypes: parsedFilters.propertyType
          ? [parsedFilters.propertyType]
          : prev.propertyTypes,
      }));

      // Phase 0a: Immediately geocode any detected location so radius filter activates
      if (parsedFilters.location) {
        const locQuery = parsedFilters.location + ', Australia';
        geocode(locQuery)
          .then((coords) => {
            if (coords) {
              setSearchCenter(coords);
              // Ensure a radius is set so the nearby_properties RPC is used
              setSearchRadius(prev => prev ?? 10);
            }
          })
          .catch(() => {});
      }

      setIsSearching(true);

      // Phase 0: AI-powered query parsing (runs in parallel with other phases)
      const aiSearchPromise = supabase.functions
        .invoke('parse-search-query', {
          body: { query: query.trim().slice(0, 300), listing_mode: listingMode },
        })
        .then(({ data, error }) => {
          if (error || !data) {
            console.warn('[handleSearch] AI parse failed:', error);
            return null;
          }
          // Update search summary from parsed intent
          if (data.parsed_intent) {
            const summary = buildSearchSummary(data.parsed_intent);
            setSearchSummary(summary);

            // Update filters from AI-parsed intent (more accurate than regex)
            const intent = data.parsed_intent;
            setFilters(prev => ({
              ...prev,
              minBeds: intent.bedrooms_min || prev.minBeds,
              minBaths: intent.bathrooms_min || prev.minBaths,
              priceRange: [
                intent.price_min || prev.priceRange[0],
                intent.price_max || prev.priceRange[1],
              ],
              propertyTypes: intent.property_type
                ? [intent.property_type]
                : prev.propertyTypes,
            }));

            // Geocode the parsed location so the map centres on it
            const locationParts = [
              intent.suburb,
              intent.state,
              intent.country,
            ].filter(Boolean);
            if (locationParts.length > 0) {
              const locationQuery = locationParts.join(', ');
              geocode(locationQuery)
                .then((coords) => {
                  if (coords) setSearchCenter(coords);
                })
                .catch(() => {
                  // Geocoding failed silently — map stays at current position
                });
            }
          }
          // Map AI results to Property objects and merge
          if (data.listings?.length > 0) {
            const mapped = data.listings.map(mapDbProperty);
            setResults(prev => {
              const ids = new Set(prev.map(p => p.id));
              const unique = mapped.filter((p: Property) => !ids.has(p.id));
              if (unique.length === 0) return prev;
              return [...unique, ...prev];
            });
          }
          return data;
        })
        .catch((err: unknown): null => {
          console.warn('[handleSearch] AI parse error:', err);
          return null;
        });

      // Phase 1 (agent listings) + Phase 2 (Firecrawl) in parallel
      const agentListingsPromise = searchAgentListings(
        query,
        20,
        listingMode,
        {
          beds: parsedFilters.beds || undefined,
          priceMin: parsedFilters.priceMin || undefined,
          priceMax: parsedFilters.priceMax || undefined,
          suburb: parsedFilters.location || undefined,
          features: parsedFilters.features.length > 0
            ? parsedFilters.features
            : undefined,
        }
      ).catch((err) => {
        console.warn('[handleSearch] Agent listings search failed:', err);
        return [] as Property[];
      });

      const firecrawlPromise = firecrawlPropertySearch(query, 8, listingMode).catch((err) => {
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
            return [...unique, ...prev];
          });
        }
      });

      // Merge Firecrawl results
      const firecrawlResults = await firecrawlPromise;
      if (firecrawlResults.length > 0) {
        setResults((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const unique = firecrawlResults.filter((p) => !ids.has(p.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
        toast.success(`🌐 Web results found — Found ${firecrawlResults.length} listings from the web`);
      }

      // Wait for AI search to complete too before marking done
      await aiSearchPromise;

      setIsSearching(false);
    },
    [addSearch, toast, listingMode, setFilters, buildSearchSummary],
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
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.some(ft => ft.toLowerCase() === p.propertyType.toLowerCase())) return false;
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
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius: handleSetSearchRadius,
    clearSearchRadius,

    // Flat state
    isSearching,
    hasSearched,
    currentQuery,
    searchCenter,
    searchRadius,
    areaSearch,
    dbLoading,
    dbError,
    searchSummary,

    // Internalized filters & sort
    filters,
    setFilters,
    sortBy,
    setSortBy,
  };
}
