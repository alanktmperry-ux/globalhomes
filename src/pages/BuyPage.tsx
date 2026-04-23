import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyCard } from '@/components/PropertyCard';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { Property } from '@/shared/lib/types';
import { Loader2, X, BellPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';
import { AIPropertySearch } from '@/features/properties/components/AIPropertySearch';
import { Switch } from '@/components/ui/switch';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { SearchModeTabs } from '@/features/search/components/SearchModeTabs';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSavedSearchesDB } from '@/features/alerts/hooks/useSavedSearchesDB';
import { toast } from 'sonner';

const PROPERTIES_WITH_AGENTS =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

interface BuyFilters {
  suburb?: string;
  state?: string;
  minBeds?: number;
  minBaths?: number;
  minParking?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

function parseFiltersFromParams(sp: URLSearchParams): BuyFilters {
  const sort = sp.get('sort');
  return {
    suburb: sp.get('q') || undefined,
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
  if (f.suburb) out.q = f.suburb;
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

const BuyPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { setListingMode } = useCurrency();
  const { user } = useAuth();
  const { saveSearch } = useSavedSearchesDB();
  const [savingSearch, setSavingSearch] = useState(false);

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
  }, [searchParams.toString()]);

  // Push filter changes to URL so they're shareable + survive refresh
  const updateFilters = useCallback((updater: (f: BuyFilters) => BuyFilters) => {
    setFilters(prev => {
      const next = updater(prev);
      setSearchParams(filtersToParams(next), { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['buy-properties', filters],
    queryFn: async (): Promise<Property[]> => {
      let q = supabase
        .from('properties')
        .select(PROPERTIES_WITH_AGENTS)
        .eq('is_active', true)
        .not('listing_type', 'eq', 'rent')
        .limit(60);

      // Sort
      if (filters.sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: false });
      else if (filters.sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
      else q = q.order('created_at', { ascending: false });

      if (filters.suburb) q = q.ilike('suburb', `%${filters.suburb}%`);
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
    setFilters({ sort: 'newest' });
    setSearchParams({});
  };

  const activeChipCount = useMemo(
    () => [filters.suburb, filters.minBeds, filters.minBaths, filters.minParking, filters.minPrice, filters.maxPrice, filters.propertyType]
      .filter(v => v !== undefined && v !== '').length,
    [filters],
  );
  const hasActiveFilters = activeChipCount > 0;

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
      const name = filters.suburb
        ? `${filters.suburb}${filters.minBeds ? ` · ${filters.minBeds}+ beds` : ''}${filters.maxPrice ? ` · under ${AUD.format(filters.maxPrice)}` : ''}`
        : t('My property search');
      await saveSearch(name, {
        suburbs: filters.suburb ? [filters.suburb] : [],
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
    } catch (e) {
      toast.error(t('Could not save search. Please try again.'));
    } finally {
      setSavingSearch(false);
    }
  }, [user, hasActiveFilters, filters, saveSearch, navigate, t]);

  return (
    <>
      <Helmet>
        <title>{filters.suburb ? `Properties for Sale in ${filters.suburb}` : 'Properties for Sale in Australia'}</title>
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
                {filters.suburb ? t(`Properties for Sale in ${filters.suburb}`) : t('Properties for Sale')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? t('Searching…') : `${properties?.length ?? 0} ${t('properties found')}`}
              </p>
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
                  suburb: parsed.location,
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
              {/* Sticky filter bar */}
              <div className="sticky top-0 z-30 bg-background/95 backdrop-blur py-3 -mx-4 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder={t('Suburb')}
                    value={filters.suburb ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, suburb: e.target.value || undefined }))}
                    className="w-40 h-9 text-sm"
                  />
                  <select
                    value={filters.propertyType ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, propertyType: e.target.value || undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                  <select
                    value={filters.minBeds ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, minBeds: e.target.value ? Number(e.target.value) : undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('Any beds')}</option>
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}+ {t('beds')}</option>
                    ))}
                  </select>
                  <select
                    value={filters.minBaths ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, minBaths: e.target.value ? Number(e.target.value) : undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('Any baths')}</option>
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n}+ {t('baths')}</option>
                    ))}
                  </select>
                  <select
                    value={filters.minParking ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, minParking: e.target.value ? Number(e.target.value) : undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('Any parking')}</option>
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n}+ {t('cars')}</option>
                    ))}
                  </select>
                  <select
                    value={filters.minPrice ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('Min price')}</option>
                    {[300000, 500000, 750000, 1000000, 1500000, 2000000].map(p => (
                      <option key={p} value={p}>{AUD.format(p)}</option>
                    ))}
                  </select>
                  <select
                    value={filters.maxPrice ?? ''}
                    onChange={e => updateFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('Max price')}</option>
                    {[500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000].map(p => (
                      <option key={p} value={p}>{AUD.format(p)}</option>
                    ))}
                  </select>
                  <select
                    value={filters.sort ?? 'newest'}
                    onChange={e => updateFilters(f => ({ ...f, sort: e.target.value as BuyFilters['sort'] }))}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm ml-auto"
                    aria-label={t('Sort by')}
                  >
                    <option value="newest">{t('Newest first')}</option>
                    <option value="price_asc">{t('Price: low to high')}</option>
                    <option value="price_desc">{t('Price: high to low')}</option>
                  </select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-sm text-muted-foreground">
                      <X className="h-3.5 w-3.5 mr-1" /> {t('Clear')}
                    </Button>
                  )}
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {filters.suburb && (
                      <span className="inline-flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filters.suburb}</span>
                    )}
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
                  </div>
                )}
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : properties && properties.length > 0 ? (
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
