import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { geocode } from '@/shared/lib/googleMapsService';
import { PropertyCard } from '@/components/PropertyCard';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { Property } from '@/shared/lib/types';
import { Loader2, X, BellPlus, Sparkles, SlidersHorizontal, Filter, Map as MapIcon, List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';
import { AIPropertySearch } from '@/features/properties/components/AIPropertySearch';
import { PropertyMap } from '@/features/properties/components/PropertyMap';
import { Switch } from '@/components/ui/switch';
import { SearchModeTabs } from '@/features/search/components/SearchModeTabs';
import { SuburbChipInput } from '@/features/search/components/SuburbChipInput';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSavedSearchesDB } from '@/features/alerts/hooks/useSavedSearchesDB';
import { toast } from 'sonner';

const PROPERTIES_WITH_AGENTS =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

interface BuyFilters {
  suburbs: string[];
  state?: string;
  minBeds?: number;
  minBaths?: number;
  minParking?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  sort: 'newest' | 'price_asc' | 'price_desc';
}

const EMPTY_FILTERS: BuyFilters = { suburbs: [], sort: 'newest' };

function parseFiltersFromParams(sp: URLSearchParams): BuyFilters {
  const sort = sp.get('sort');
  const q = sp.get('q');
  const location = sp.get('location'); // e.g. ?location=St+Kilda from search bar
  // Support `?q=Toorak,Hawthorn`, repeated `?suburb=`, or `?location=Prahran`
  let suburbs: string[] = [];
  if (q) {
    suburbs = q.split(',').map(s => s.trim()).filter(Boolean);
  } else if (location) {
    suburbs = location.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    suburbs = sp.getAll('suburb').filter(Boolean);
  }
  return {
    suburbs,
    minBeds: sp.get('beds') ? Number(sp.get('beds')) : undefined,
    minBaths: sp.get('baths') ? Number(sp.get('baths')) : undefined,
    minParking: sp.get('parking') ? Number(sp.get('parking')) : undefined,
    minPrice: sp.get('priceMin') ? Number(sp.get('priceMin')) : undefined,
    maxPrice: sp.get('priceMax') ? Number(sp.get('priceMax')) : undefined,
    propertyType: sp.get('type') || undefined,
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest',
  };
}

function filtersToParams(f: BuyFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.suburbs.length) out.q = f.suburbs.join(',');
  if (f.minBeds) out.beds = String(f.minBeds);
  if (f.minBaths) out.baths = String(f.minBaths);
  if (f.minParking) out.parking = String(f.minParking);
  if (f.minPrice) out.priceMin = String(f.minPrice);
  if (f.maxPrice) out.priceMax = String(f.maxPrice);
  if (f.propertyType) out.type = f.propertyType;
  if (f.sort && f.sort !== 'newest') out.sort = f.sort;
  return out;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

/* ---------------- Filter controls (shared by desktop + mobile sheet) ---------------- */

interface FilterControlsProps {
  filters: BuyFilters;
  onChange: (updater: (f: BuyFilters) => BuyFilters) => void;
  layout: 'inline' | 'stacked';
}

function FilterControls({ filters, onChange, layout }: FilterControlsProps) {
  const { t } = useI18n();
  const stacked = layout === 'stacked';
  const fieldClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
  const wrap = stacked ? 'space-y-3' : 'flex flex-wrap items-center gap-2';
  const fieldWrap = stacked ? 'block w-full' : '';

  return (
    <div className={wrap}>
      <div className={stacked ? 'block' : 'min-w-[220px] max-w-md flex-1'}>
        {stacked && <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('Suburbs')}</label>}
        <SuburbChipInput
          values={filters.suburbs}
          onChange={(next) => onChange(f => ({ ...f, suburbs: next }))}
          placeholder={t('Add suburbs…')}
        />
      </div>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Property type')}</label>}
      <select
        value={filters.propertyType ?? ''}
        onChange={e => onChange(f => ({ ...f, propertyType: e.target.value || undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Any type')}</option>
        <optgroup label="Residential">
          <option value="House">House</option>
          <option value="Apartment">Apartment</option>
          <option value="Townhouse">Townhouse</option>
          <option value="Unit">Unit</option>
          <option value="Villa">Villa</option>
          <option value="Terrace">Terrace</option>
          <option value="Duplex">Duplex</option>
          <option value="Studio">Studio</option>
        </optgroup>
        <optgroup label="Commercial">
          <option value="Office">Office</option>
          <option value="Retail">Retail</option>
          <option value="Industrial">Industrial</option>
          <option value="Warehouse">Warehouse</option>
        </optgroup>
        <optgroup label="Land">
          <option value="Land">Land</option>
        </optgroup>
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Bedrooms')}</label>}
      <select
        value={filters.minBeds ?? ''}
        onChange={e => onChange(f => ({ ...f, minBeds: e.target.value ? Number(e.target.value) : undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Any beds')}</option>
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+ {t('beds')}</option>)}
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Bathrooms')}</label>}
      <select
        value={filters.minBaths ?? ''}
        onChange={e => onChange(f => ({ ...f, minBaths: e.target.value ? Number(e.target.value) : undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Any baths')}</option>
        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+ {t('baths')}</option>)}
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Parking')}</label>}
      <select
        value={filters.minParking ?? ''}
        onChange={e => onChange(f => ({ ...f, minParking: e.target.value ? Number(e.target.value) : undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Any parking')}</option>
        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+ {t('cars')}</option>)}
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Min price')}</label>}
      <select
        value={filters.minPrice ?? ''}
        onChange={e => onChange(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Min price')}</option>
        {[300000, 500000, 750000, 1000000, 1500000, 2000000].map(p => (
          <option key={p} value={p}>{AUD.format(p)}</option>
        ))}
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Max price')}</label>}
      <select
        value={filters.maxPrice ?? ''}
        onChange={e => onChange(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
        className={`${fieldClass} ${fieldWrap}`}
      >
        <option value="">{t('Max price')}</option>
        {[500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000].map(p => (
          <option key={p} value={p}>{AUD.format(p)}</option>
        ))}
      </select>

      {stacked && <label className="text-xs font-medium text-muted-foreground block">{t('Sort by')}</label>}
      <select
        value={filters.sort}
        onChange={e => onChange(f => ({ ...f, sort: e.target.value as BuyFilters['sort'] }))}
        className={`${fieldClass} ${fieldWrap} ${stacked ? '' : 'ml-auto'}`}
        aria-label={t('Sort by')}
      >
        <option value="newest">{t('Newest first')}</option>
        <option value="price_asc">{t('Price: low to high')}</option>
        <option value="price_desc">{t('Price: high to low')}</option>
      </select>
    </div>
  );
}

/* ---------------- Page ---------------- */

const BuyPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { setListingMode } = useCurrency();
  const { user } = useAuth();
  const { saveSearch } = useSavedSearchesDB();
  const [savingSearch, setSavingSearch] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>(() => {
    const stored = localStorage.getItem('buy-view-mode');
    if (stored === 'list' || stored === 'map' || stored === 'split') return stored;
    return 'list';
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>();
  useEffect(() => { localStorage.setItem('buy-view-mode', viewMode); }, [viewMode]);

  // Melbourne fallback
  const FALLBACK_CENTER = { lat: -37.8136, lng: 144.9631 };
  const FALLBACK_ZOOM = 11;
  const SUBURB_ZOOM = 14;

  // Map center + zoom, optionally cached in URL params (?lat=&lng=&z=)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });
  const [mapZoom, setMapZoom] = useState<number>(() => {
    const z = parseInt(searchParams.get('z') || '', 10);
    return Number.isFinite(z) ? z : FALLBACK_ZOOM;
  });

  const [filters, setFilters] = useState<BuyFilters>(() => parseFiltersFromParams(searchParams));
  const [searchMode, setSearchMode] = useState<'ai' | 'filter'>(() => {
    const stored = localStorage.getItem('search-mode');
    if (stored === 'ai' || stored === 'filter') return stored;
    localStorage.setItem('search-mode', 'ai');
    return 'ai';
  });

  useEffect(() => { setListingMode('sale'); }, []);
  useEffect(() => { localStorage.setItem('search-mode', searchMode); }, [searchMode]);

  // Re-sync filters when URL params change (e.g. new voice search navigation)
  useEffect(() => {
    setFilters(parseFiltersFromParams(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Push filter changes to URL so they're shareable + survive refresh
  const updateFilters = useCallback((updater: (f: BuyFilters) => BuyFilters) => {
    setFilters(prev => {
      const next = updater(prev);
      setSearchParams(filtersToParams(next), { replace: true });
      return next;
    });
  }, [setSearchParams]);

  // Geocode the first searched suburb so the map zooms in to it (e.g. "St Kilda")
  // Cache lat/lng/zoom in URL params so back-navigation preserves the view.
  const primarySuburb = filters.suburbs[0];
  useEffect(() => {
    let cancelled = false;
    const cachedLat = parseFloat(searchParams.get('lat') || '');
    const cachedLng = parseFloat(searchParams.get('lng') || '');
    const hasCached = Number.isFinite(cachedLat) && Number.isFinite(cachedLng);

    if (!primarySuburb) {
      // No suburb: fall back to Melbourne center
      if (!hasCached) {
        setMapCenter(FALLBACK_CENTER);
        setMapZoom(FALLBACK_ZOOM);
      }
      return;
    }

    if (hasCached) {
      // URL already has coords — use them and skip refetch
      setMapCenter({ lat: cachedLat, lng: cachedLng });
      const z = parseInt(searchParams.get('z') || '', 10);
      setMapZoom(Number.isFinite(z) ? z : SUBURB_ZOOM);
      return;
    }

    geocode(`${primarySuburb}, Australia`)
      .then((coords) => {
        if (cancelled) return;
        if (coords) {
          setMapCenter(coords);
          setMapZoom(SUBURB_ZOOM);
          // Persist into URL so navigating back preserves the view
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('lat', coords.lat.toFixed(5));
            next.set('lng', coords.lng.toFixed(5));
            next.set('z', String(SUBURB_ZOOM));
            return next;
          }, { replace: true });
        } else {
          setMapCenter(FALLBACK_CENTER);
          setMapZoom(FALLBACK_ZOOM);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapCenter(FALLBACK_CENTER);
          setMapZoom(FALLBACK_ZOOM);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primarySuburb]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['buy-properties', filters],
    queryFn: async (): Promise<Property[]> => {
      let q = supabase
        .from('properties')
        .select(PROPERTIES_WITH_AGENTS)
        .eq('is_active', true)
        .not('agent_id', 'is', null)
        .not('listing_type', 'eq', 'rent')
        .limit(60);

      if (filters.sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: false });
      else if (filters.sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
      else q = q.order('created_at', { ascending: false });

      if (filters.suburbs.length === 1) {
        q = q.ilike('suburb', `%${filters.suburbs[0]}%`);
      } else if (filters.suburbs.length > 1) {
        // Postgres OR filter — match any of the selected suburbs
        const orExpr = filters.suburbs.map(s => `suburb.ilike.%${s.replace(/[%,()]/g, '')}%`).join(',');
        q = q.or(orExpr);
      }
      if (filters.state) q = q.eq('state', filters.state.toUpperCase());
      if (filters.minBeds) q = q.gte('beds', filters.minBeds);
      if (filters.minBaths) q = q.gte('baths', filters.minBaths);
      if (filters.minParking) q = q.gte('cars', filters.minParking);
      if (filters.minPrice) q = q.gte('price', filters.minPrice);
      if (filters.maxPrice) q = q.lte('price', filters.maxPrice);
      if (filters.propertyType) q = q.ilike('property_type', `%${filters.propertyType}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => mapDbProperty(p));
    },
  });

  const handleSelect = useCallback((property: Property) => {
    navigate(`/property/${property.id}`);
  }, [navigate]);

  const handleToggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
  };

  const activeChipCount = useMemo(
    () => filters.suburbs.length
      + [filters.minBeds, filters.minBaths, filters.minParking, filters.minPrice, filters.maxPrice, filters.propertyType]
        .filter(v => v !== undefined && v !== '').length,
    [filters],
  );
  const hasActiveFilters = activeChipCount > 0;

  const headerSuburbLabel = filters.suburbs.length === 1
    ? filters.suburbs[0]
    : filters.suburbs.length > 1
      ? `${filters.suburbs.length} ${t('suburbs')}`
      : null;

  const handleSaveSearch = useCallback(async () => {
    if (!user) {
      toast.info(t('Sign in to save this search and get email alerts'), {
        action: { label: t('Sign in'), onClick: () => navigate('/login') },
      });
      return;
    }
    if (!hasActiveFilters) {
      toast.info(t('Add some filters first, then save your search.'));
      return;
    }
    setSavingSearch(true);
    try {
      const labelParts: string[] = [];
      if (filters.suburbs.length) labelParts.push(filters.suburbs.join(', '));
      if (filters.minBeds) labelParts.push(`${filters.minBeds}+ beds`);
      if (filters.maxPrice) labelParts.push(`under ${AUD.format(filters.maxPrice)}`);
      const name = labelParts.length ? labelParts.join(' · ') : t('My property search');
      await saveSearch(name, {
        suburbs: filters.suburbs,
        min_price: filters.minPrice ?? null,
        max_price: filters.maxPrice ?? null,
        min_bedrooms: filters.minBeds ?? null,
        min_bathrooms: filters.minBaths ?? null,
        property_types: filters.propertyType ? [filters.propertyType] : [],
        listing_mode: 'sale',
      } as any, 'instant');
      toast.success(t("Search saved — we'll email you when new matches appear."), {
        action: { label: t('Manage'), onClick: () => navigate('/saved') },
      });
    } catch {
      toast.error(t('Could not save search. Please try again.'));
    } finally {
      setSavingSearch(false);
    }
  }, [user, hasActiveFilters, filters, saveSearch, navigate, t]);

  return (
    <>
      <Helmet>
        <title>{headerSuburbLabel ? `Properties for Sale in ${headerSuburbLabel}` : 'Properties for Sale in Australia'}</title>
        <meta name="description" content="Browse properties for sale across Australia on ListHQ." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Mode tabs — Buy / Rent / Sold */}
          <div className="flex justify-center sm:justify-start">
            <SearchModeTabs />
          </div>

          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {headerSuburbLabel ? t(`Properties for Sale in ${headerSuburbLabel}`) : t('Properties for Sale')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? t('Searching…') : `${properties?.length ?? 0} ${t('properties found')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:inline-flex rounded-md border border-input p-0.5 bg-card">
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={`px-2.5 h-8 rounded text-xs font-medium inline-flex items-center gap-1 transition ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ListIcon className="h-3.5 w-3.5" /> {t('List')}
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  aria-pressed={viewMode === 'split'}
                  className={`px-2.5 h-8 rounded text-xs font-medium inline-flex items-center gap-1 transition ${viewMode === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <MapIcon className="h-3.5 w-3.5" /> {t('Split')}
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  aria-pressed={viewMode === 'map'}
                  className={`px-2.5 h-8 rounded text-xs font-medium inline-flex items-center gap-1 transition ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <MapIcon className="h-3.5 w-3.5" /> {t('Map')}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSearch}
                disabled={savingSearch}
                className="gap-1.5"
              >
                <BellPlus className="h-4 w-4" />
                {savingSearch ? t('Saving…') : t('Save search & alert me')}
              </Button>
            </div>
          </div>

          {/* Search mode toggle */}
          <div className="flex items-center justify-end gap-3 text-sm">
            <span className={`flex items-center gap-1.5 ${searchMode === 'filter' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> {t('Filter search')}
            </span>
            <Switch
              checked={searchMode === 'ai'}
              onCheckedChange={c => setSearchMode(c ? 'ai' : 'filter')}
            />
            <span className={`flex items-center gap-1.5 ${searchMode === 'ai' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              <Sparkles className="h-3.5 w-3.5" /> {t('AI search')}
            </span>
          </div>

          {/* AI Search */}
          {searchMode === 'ai' && (
            <AIPropertySearch
              onRefineWithFilters={(parsed) => {
                setSearchMode('filter');
                updateFilters(() => ({
                  suburbs: parsed.location ? [parsed.location] : [],
                  minBeds: parsed.beds,
                  minPrice: parsed.priceMin,
                  maxPrice: parsed.priceMax,
                  propertyType: parsed.propertyType,
                  sort: 'newest',
                }));
              }}
            />
          )}

          {searchMode === 'filter' && (
            <>
              {/* Mobile: Filter button opens bottom sheet */}
              <div className="md:hidden flex items-center gap-2">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Filter className="h-4 w-4" />
                      {t('Filters')}
                      {activeChipCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {activeChipCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                    <SheetHeader className="text-left">
                      <SheetTitle>{t('Filter properties')}</SheetTitle>
                    </SheetHeader>
                    <div className="py-4">
                      <FilterControls filters={filters} onChange={updateFilters} layout="stacked" />
                    </div>
                    <SheetFooter className="flex-row gap-2 sm:flex-row">
                      {hasActiveFilters && (
                        <Button variant="outline" className="flex-1" onClick={clearFilters}>
                          {t('Clear all')}
                        </Button>
                      )}
                      <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                        {t('Show')} {properties?.length ?? 0} {t('results')}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Desktop: Inline sticky filter bar */}
              <div className="hidden md:block sticky top-0 z-30 bg-background/95 backdrop-blur py-3 -mx-4 px-4">
                <FilterControls filters={filters} onChange={updateFilters} layout="inline" />
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {filters.suburbs.map(s => (
                      <span key={s} className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">📍 {s}</span>
                    ))}
                    {filters.minBeds && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filters.minBeds}+ {t('beds')}</span>
                    )}
                    {filters.minBaths && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filters.minBaths}+ {t('baths')}</span>
                    )}
                    {filters.minParking && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filters.minParking}+ {t('cars')}</span>
                    )}
                    {filters.maxPrice && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{t('Under')} {AUD.format(filters.maxPrice)}</span>
                    )}
                    {filters.minPrice && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{t('Over')} {AUD.format(filters.minPrice)}</span>
                    )}
                    {filters.propertyType && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{t(filters.propertyType)}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground ml-1">
                      <X className="h-3 w-3 mr-1" /> {t('Clear all')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : properties && properties.length > 0 ? (
                viewMode === 'map' ? (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <PropertyMap
                      properties={properties}
                      onPropertySelect={(p) => setSelectedPropertyId(p.id)}
                      selectedPropertyId={selectedPropertyId}
                      centerOn={mapCenter ? { ...mapCenter, key: `${primarySuburb || 'fallback'}-${mapZoom}` } : null}
                      initialZoom={mapZoom}
                      height="calc(100vh - 280px)"
                    />
                  </div>
                ) : viewMode === 'split' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                      {properties.map((property, index) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          onSelect={handleSelect}
                          isSaved={savedIds.has(property.id)}
                          onToggleSave={handleToggleSave}
                          index={index}
                        />
                      ))}
                    </div>
                    <div className="hidden lg:block sticky top-20 h-[calc(100vh-220px)] rounded-xl overflow-hidden border border-border">
                      <PropertyMap
                        properties={properties}
                        onPropertySelect={(p) => { setSelectedPropertyId(p.id); }}
                        selectedPropertyId={selectedPropertyId}
                        centerOn={mapCenter ? { ...mapCenter, key: `${primarySuburb || 'fallback'}-${mapZoom}` } : null}
                        initialZoom={mapZoom}
                        height="100%"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {properties.map((property, index) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onSelect={handleSelect}
                        isSaved={savedIds.has(property.id)}
                        onToggleSave={handleToggleSave}
                        index={index}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-20 space-y-3">
                  <p className="text-muted-foreground">{t('No properties match your search.')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('Try removing some filters or broadening your price range.')}
                  </p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-2 text-primary underline text-sm">
                      {t('Clear all filters')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BuyPage;
