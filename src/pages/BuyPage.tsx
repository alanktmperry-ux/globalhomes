import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyCard } from '@/components/PropertyCard';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { Property } from '@/shared/lib/types';
import { Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';
import { AIPropertySearch } from '@/features/properties/components/AIPropertySearch';
import { Switch } from '@/components/ui/switch';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

const PROPERTIES_WITH_AGENTS =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

interface BuyFilters {
  suburb?: string;
  state?: string;
  minBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
}

function parseFiltersFromParams(sp: URLSearchParams): BuyFilters {
  return {
    suburb: sp.get('q') || undefined,
    minBeds: sp.get('beds') ? Number(sp.get('beds')) : undefined,
    minPrice: sp.get('priceMin') ? Number(sp.get('priceMin')) : undefined,
    maxPrice: sp.get('priceMax') ? Number(sp.get('priceMax')) : undefined,
    propertyType: sp.get('type') || undefined,
  };
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const BuyPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { setListingMode } = useCurrency();

  const [filters, setFilters] = useState<BuyFilters>(() => parseFiltersFromParams(searchParams));
  const [searchMode, setSearchMode] = useState<'ai' | 'filter'>(() => {
    const stored = localStorage.getItem('search-mode');
    if (stored === 'ai' || stored === 'filter') return stored;
    // First-time visitor → AI search default
    localStorage.setItem('search-mode', 'ai');
    return 'ai';
  });

  useEffect(() => { setListingMode('sale'); }, []);
  useEffect(() => { localStorage.setItem('search-mode', searchMode); }, [searchMode]);

  // Re-sync filters when URL params change (e.g. new voice search navigation)
  useEffect(() => {
    setFilters(parseFiltersFromParams(searchParams));
  }, [searchParams.toString()]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['buy-properties', filters],
    queryFn: async (): Promise<Property[]> => {
      let q = supabase
        .from('properties')
        .select(PROPERTIES_WITH_AGENTS)
        .eq('is_active', true)
        .not('listing_type', 'eq', 'rent')
        .order('created_at', { ascending: false })
        .limit(60);

      if (filters.suburb) q = q.ilike('suburb', `%${filters.suburb}%`);
      if (filters.state) q = q.eq('state', filters.state.toUpperCase());
      if (filters.minBeds) q = q.gte('beds', filters.minBeds);
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
    setFilters({});
    setSearchParams({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <>
      <Helmet>
        <title>{filters.suburb ? `Properties for Sale in ${filters.suburb}` : 'Properties for Sale in Australia'}</title>
        <meta name="description" content="Browse properties for sale across Australia on ListHQ." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {filters.suburb ? t(`Properties for Sale in ${filters.suburb}`) : t('Properties for Sale')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? t('Searching…') : `${properties?.length ?? 0} ${t('properties found')}`}
            </p>
          </div>

          {/* Sticky filter bar */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur py-3 -mx-4 px-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder={t('Suburb')}
                value={filters.suburb ?? ''}
                onChange={e => setFilters(f => ({ ...f, suburb: e.target.value || undefined }))}
                className="w-40 h-9 text-sm"
              />
              <select
                value={filters.minBeds ?? ''}
                onChange={e => setFilters(f => ({ ...f, minBeds: e.target.value ? Number(e.target.value) : undefined }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t('Any beds')}</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}+ {t('beds')}</option>
                ))}
              </select>
              <select
                value={filters.maxPrice ?? ''}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t('Max price')}</option>
                {[500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000].map(p => (
                  <option key={p} value={p}>{AUD.format(p)}</option>
                ))}
              </select>
              <select
                value={filters.propertyType ?? ''}
                onChange={e => setFilters(f => ({ ...f, propertyType: e.target.value || undefined }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t('Any type')}</option>
                {['House', 'Apartment', 'Townhouse', 'Villa', 'Land', 'Unit'].map(pt => (
                  <option key={pt} value={pt}>{t(pt)}</option>
                ))}
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
            <div className="text-center py-20">
              <p className="text-muted-foreground">{t('No properties match your search.')}</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 text-primary underline text-sm">
                  {t('Clear all filters')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BuyPage;
