import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useRentalSearch, type RentalFilters } from '../hooks/useRentalSearch';
import { RentalSearchFilters } from '../components/RentalSearchFilters';
import { RentalCard } from '../components/RentalCard';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { SearchModeTabs } from '@/features/search/components/SearchModeTabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

function parseRentalFiltersFromParams(sp: URLSearchParams): RentalFilters {
  return {
    suburb: sp.get('q') || undefined,
    minBedrooms: sp.get('beds') ? Number(sp.get('beds')) : undefined,
    minRent: sp.get('priceMin') ? Number(sp.get('priceMin')) : undefined,
    maxRent: sp.get('priceMax') ? Number(sp.get('priceMax')) : undefined,
    propertyTypes: sp.get('type') ? [sp.get('type')!] : undefined,
  };
}

export default function RentSearchPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<RentalFilters>(() => parseRentalFiltersFromParams(searchParams));
  const { properties, loading, total } = useRentalSearch(filters);
  const { t } = useTranslation();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Re-sync when URL params change (voice search navigation)
  useEffect(() => {
    const parsed = parseRentalFiltersFromParams(searchParams);
    const hasUrlFilters = Object.values(parsed).some(v => v !== undefined);
    if (hasUrlFilters) setFilters(prev => ({ ...prev, ...parsed }));
  }, [searchParams.toString()]);

  const activeCount = useMemo(
    () => Object.values(filters).filter(v =>
      v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    ).length,
    [filters],
  );

  return (
    <>
      <Helmet>
        <title>Rental Properties Australia — Find Your Next Home</title>
        <meta name="description" content="Browse rental properties across Australia. Search by suburb, price, bedrooms, and pet-friendly options. Apply online with ListHQ." />
        <link rel="canonical" href="https://listhq.com.au/rent" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-center sm:justify-start">
          <SearchModeTabs />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {t('rent.pageTitle')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? t('rent.searching')
              : (total === 1
                  ? t('rent.found.one', { count: total.toLocaleString() })
                  : t('rent.found.other', { count: total.toLocaleString() }))}
          </p>
        </div>

        {/* Mobile: filter sheet trigger */}
        <div className="md:hidden flex items-center gap-2">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2">
                <Filter className="h-4 w-4" />
                {t('rental.filters') || 'Filters'}
                {activeCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>{t('rental.filters') || 'Filter rentals'}</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <RentalSearchFilters value={filters} onChange={setFilters} />
              </div>
              <SheetFooter className="flex-row gap-2 sm:flex-row">
                {activeCount > 0 && (
                  <Button variant="outline" className="flex-1" onClick={() => setFilters({})}>
                    {t('rental.clearFilters') || 'Clear all'}
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                  Show {total} results
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Desktop: inline sticky filter bar */}
        <div className="hidden md:block sticky top-0 z-30 bg-background/95 backdrop-blur py-3 -mx-4 px-4">
          <RentalSearchFilters value={filters} onChange={setFilters} />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {!loading && t('rent.showing', { shown: String(properties.length), total: String(total) })}
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-secondary rounded-2xl h-72" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('rent.noResults')}</p>
            <button onClick={() => setFilters({})}
              className="mt-4 text-primary underline text-sm">
              {t('rental.clearFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {properties.map(p => <RentalCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
