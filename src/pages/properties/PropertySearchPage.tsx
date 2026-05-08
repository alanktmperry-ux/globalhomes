import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Intent = 'buy' | 'rent' | '';

interface Filters {
  suburb: string;
  intent: Intent;
  priceMin: number | '';
  priceMax: number | '';
  bedsMin: number | '';
  propertyType: string;
}

const EMPTY: Filters = {
  suburb: '', intent: '', priceMin: '', priceMax: '', bedsMin: '', propertyType: '',
};

interface PropertyRow {
  id: string;
  address: string | null;
  suburb: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  property_type: string | null;
  listing_type: string | null;
  status: string | null;
  images: string[] | null;
  image_url: string | null;
  translations: any;
}

const TYPES = ['House', 'Apartment', 'Townhouse', 'Unit', 'Land', 'Rural', 'Commercial'];

export default function PropertySearchPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [debouncedSuburb, setDebouncedSuburb] = useState('');
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce suburb input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSuburb(filters.suburb.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.suburb]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      let query = supabase
        .from('properties')
        .select('id, address, suburb, price, beds, baths, parking, property_type, listing_type, status, images, image_url, translations')
        .in('status', ['public', 'active', 'published', 'under_offer'])
        .order('created_at', { ascending: false })
        .limit(48);

      if (debouncedSuburb) {
        const safe = debouncedSuburb.replace(/[%,()]/g, '');
        query = query.or(`suburb.ilike.%${safe}%,address.ilike.%${safe}%`);
      }
      if (filters.intent) {
        query = query.eq('listing_type', filters.intent === 'rent' ? 'rent' : 'sale');
      }
      if (filters.bedsMin) query = query.gte('beds', filters.bedsMin);
      if (filters.propertyType) query = query.eq('property_type', filters.propertyType);
      if (filters.priceMin) query = query.gte('price', filters.priceMin);
      if (filters.priceMax) query = query.lte('price', filters.priceMax);

      const { data } = await query;
      if (!cancelled) {
        setProperties((data as any) ?? []);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedSuburb, filters.intent, filters.bedsMin, filters.propertyType, filters.priceMin, filters.priceMax]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== '' && v !== EMPTY[k as keyof Filters]),
    [filters],
  );
  const clearFilters = () => setFilters(EMPTY);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Browse properties | ListHQ</title>
        <meta name="description" content="Browse properties listed by ListHQ agents — available in 10 languages." />
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Find your next home</h1>
          <p className="text-sm text-muted-foreground">
            Browse properties listed by ListHQ agents — available in 10 languages.
          </p>
          <Link to="/halo/new" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Sparkles size={14} /> Create a Halo →
          </Link>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Suburb or address..."
              value={filters.suburb}
              onChange={e => setFilters(f => ({ ...f, suburb: e.target.value }))}
              className="w-full sm:w-48"
            />

            <Select value={filters.intent || 'any'} onValueChange={v => setFilters(f => ({ ...f, intent: v === 'any' ? '' : v as Intent }))}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Buy or rent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.bedsMin === '' ? 'any' : String(filters.bedsMin)}
              onValueChange={v => setFilters(f => ({ ...f, bedsMin: v === 'any' ? '' : Number(v) }))}
            >
              <SelectTrigger className="w-28"><SelectValue placeholder="Bedrooms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any beds</SelectItem>
                {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}+ beds</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={filters.propertyType || 'any'}
              onValueChange={v => setFilters(f => ({ ...f, propertyType: v === 'any' ? '' : v }))}
            >
              <SelectTrigger className="w-36"><SelectValue placeholder="Property type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min price"
                value={filters.priceMin}
                onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : '' }))}
                className="w-28"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                placeholder="Max price"
                value={filters.priceMax}
                onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : '' }))}
                className="w-28"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading properties…' : `Showing ${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-[16/9] bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : properties.length === 0 ? (
            <div className="col-span-full text-center py-16 space-y-2">
              <p className="font-semibold text-foreground">No properties found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or broadening your search.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-primary underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            properties.map(p => {
              const img = p.images?.[0] || p.image_url;
              const hasTranslations = p.translations && typeof p.translations === 'object' && Object.keys(p.translations).length > 0;
              return (
                <Link
                  key={p.id}
                  to={`/properties/${p.id}`}
                  className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-[16/9] bg-muted overflow-hidden relative">
                    {p.status === 'under_offer' && (
                      <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                        Under offer
                      </span>
                    )}
                    {img ? (
                      <img
                        src={img}
                        alt={p.address || 'Property'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={32} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{p.address || 'Address on enquiry'}</p>
                      <p className="text-xs text-muted-foreground">{p.suburb}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground">
                        {p.price ? `$${Number(p.price).toLocaleString('en-AU')}` : 'POA'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.beds ?? 0}bd · {p.baths ?? 0}ba{p.parking ? ` · ${p.parking}car` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{p.property_type}</span>
                      {hasTranslations && (
                        <span className="text-xs text-primary font-medium">🌐 Multilingual</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
