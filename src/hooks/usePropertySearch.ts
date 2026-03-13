import { useState, useCallback, useMemo, useEffect } from 'react';
import { Property } from '@/lib/types';
import { mockProperties } from '@/lib/mock-data';
import { manusSearch } from '@/lib/ManusSearchService';
import { supabase } from '@/integrations/supabase/client';
import { Filters } from '@/components/FilterSidebar';
import { useToast } from '@/hooks/use-toast';

// ── Geo helpers ──────────────────────────────────────────────

export type AreaSearch =
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

// ── Map DB row → Property ────────────────────────────────────

function mapDbProperty(p: any): Property {
  return {
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
    agent: p.agents
      ? {
          id: p.agent_id || '',
          name: p.agents.name || 'Agent',
          agency: p.agents.agency || '',
          phone: p.agents.phone || '',
          email: p.agents.email || '',
          avatarUrl: p.agents.avatar_url || '',
          isSubscribed: p.agents.is_subscribed || false,
        }
      : { id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
    listedDate: p.listed_date || p.created_at,
    views: p.views,
    contactClicks: p.contact_clicks,
    lat: p.lat || undefined,
    lng: p.lng || undefined,
    status: 'listed' as const,
  };
}

// ── Hook options ─────────────────────────────────────────────

export interface PropertySearchState {
  isSearching: boolean;
  hasSearched: boolean;
  manusStatus: string | null;
  /** Whether AI search failed and we're showing DB-only results */
  manusFailed: boolean;
  currentQuery: string;
  searchCenter: { lat: number; lng: number } | null;
  searchRadius: number | null;
  areaSearch: AreaSearch | null;
  dbLoading: boolean;
  dbError: string | null;
}

export interface UsePropertySearchOptions {
  filters: Filters;
  sortBy: 'default' | 'price-asc' | 'price-desc' | 'newest' | 'beds';
  addSearch: (q: string) => void;
}

export function usePropertySearch({ filters, sortBy, addSearch }: UsePropertySearchOptions) {
  const { toast } = useToast();

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
        .select('*, agents(name, agency, phone, email, avatar_url, is_subscribed)')
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
    },
    [addSearch, toast],
  );

  // ── Derived: all properties (DB + mock fallback) ─────────────
  // This serves as the "Global recommendations / featured" feed shown
  // before any search is performed. Future enhancement: personalise this
  // with location-based suggestions, trending listings, or user-preference
  // matching (budget, beds, saved suburbs, etc.).
  const allProperties = useMemo(() => {
    const dbIds = new Set(dbProperties.map((p) => p.id));
    const mockFiltered = mockProperties.slice(0, 6).filter((p) => !dbIds.has(p.id));
    return [...dbProperties, ...mockFiltered];
  }, [dbProperties]);

  // ── Derived: display properties ───────────────────────────────
  // When `hasSearched` is false → show the global recommendations feed above.
  // When `hasSearched` is true  → show DB matches for `currentQuery` merged
  //   with external (Manus) results, DB-first, deduplicated by id.
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

    // Radius filter
    if (searchCenter && searchRadius) {
      const radiusMeters = searchRadius * 1000;
      props = props.filter((p) => {
        if (p.lat && p.lng) {
          return haversineDistance(p.lat, p.lng, searchCenter.lat, searchCenter.lng) <= radiusMeters;
        }
        return false;
      });
    }

    // Area filter (map drawing)
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
    props = props.filter((p) => {
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(p.propertyType)) return false;
      if (p.beds < filters.minBeds) return false;
      if (p.baths < filters.minBaths) return false;
      if (p.parking < filters.minParking) return false;
      if (filters.features.length > 0 && !filters.features.every((f) => p.features.some((pf) => pf.toLowerCase().includes(f.toLowerCase())))) return false;
      return true;
    });

    // Sort — subscribed agents get a subtle boost (tie-breaker: featured first)
    const subscriptionBoost = (p: Property) => (p.agent.isSubscribed ? 0 : 1);

    const withBoost = (compareFn: (a: Property, b: Property) => number) =>
      [...props].sort((a, b) => compareFn(a, b) || subscriptionBoost(a) - subscriptionBoost(b));

    if (sortBy === 'price-asc') return withBoost((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return withBoost((a, b) => b.price - a.price);
    if (sortBy === 'newest') return withBoost((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    if (sortBy === 'beds') return withBoost((a, b) => b.beds - a.beds);

    // Default sort: subscribed agents' listings float to top
    return [...props].sort((a, b) => subscriptionBoost(a) - subscriptionBoost(b));
  }, [displayProperties, areaSearch, sortBy, filters, searchCenter, searchRadius]);

  // ── Setters exposed to the page ──────────────────────────────
  const handleAreaSearch = useCallback((area: AreaSearch | null) => {
    setAreaSearch(area || null);
  }, []);

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

  // ── Return ───────────────────────────────────────────────────
  return {
    // Data
    agents,
    displayProperties,
    filteredProperties,

    // Actions
    handleSearch,
    handleAreaSearch,
    setSearchCenter,
    setSearchRadius,
    clearSearchRadius,

    // State
    searchState: {
      isSearching,
      hasSearched,
      manusStatus,
      currentQuery,
      searchCenter,
      searchRadius,
      areaSearch,
      dbLoading,
      dbError,
    } satisfies PropertySearchState,
  };
}
