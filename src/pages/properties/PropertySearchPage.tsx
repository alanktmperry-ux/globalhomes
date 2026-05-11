import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Search as SearchIcon, X, ArrowRight, Heart, Grid3x3, Map as MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation } from '@/shared/lib/i18n';

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
  const { t } = useTranslation();
  usePageTitle('Browse Properties');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [debouncedSuburb, setDebouncedSuburb] = useState('');
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [sort, setSort] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');

  // Debounce suburb input
  useEffect(() => {
    const tm = setTimeout(() => setDebouncedSuburb(filters.suburb.trim()), 300);
    return () => clearTimeout(tm);
  }, [filters.suburb]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      let query = supabase
        .from('properties')
        .select('id, address, suburb, price, beds, baths, parking, property_type, listing_type, status, images, image_url, translations')
        .in('status', ['public', 'active', 'published', 'under_offer'])
        .limit(48);

      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'priceAsc') query = query.order('price', { ascending: true, nullsFirst: false });
      else if (sort === 'priceDesc') query = query.order('price', { ascending: false, nullsFirst: false });

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
  }, [debouncedSuburb, filters.intent, filters.bedsMin, filters.propertyType, filters.priceMin, filters.priceMax, sort]);

  const hasActiveFilters = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== '' && v !== EMPTY[k as keyof Filters]),
    [filters],
  );
  const clearFilters = () => setFilters(EMPTY);

  const activeChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.intent) chips.push({ key: 'intent', label: filters.intent === 'buy' ? t('propertySearch.filter.buy') : t('propertySearch.filter.rent') });
    if (filters.bedsMin) chips.push({ key: 'bedsMin', label: t('propertySearch.filter.bedsPlus', { n: filters.bedsMin }) });
    if (filters.propertyType) chips.push({ key: 'propertyType', label: filters.propertyType });
    if (filters.priceMax) chips.push({ key: 'priceMax', label: `Under $${Number(filters.priceMax).toLocaleString('en-AU')}` });
    if (filters.priceMin) chips.push({ key: 'priceMin', label: `From $${Number(filters.priceMin).toLocaleString('en-AU')}` });
    return chips;
  }, [filters, t]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Helmet>
        <title>{t('propertySearch.metaTitle')}</title>
        <meta name="description" content={t('propertySearch.metaDesc')} />
      </Helmet>

      {/* Results header */}
      <div className="max-w-[1480px] mx-auto px-6 sm:px-8 pt-[120px] pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.03em] text-black leading-tight">
            {t('propertySearch.heading')}
          </h1>
          <p className="text-[13px] text-[#6a6a6a] mt-2">
            {loading
              ? t('propertySearch.loading')
              : t(properties.length === 1 ? 'propertySearch.resultsCount' : 'propertySearch.resultsCountPlural', { count: properties.length })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="inline-flex items-center bg-white border border-[#E5E5E5] rounded-full p-1">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                view === 'grid' ? 'bg-[#0a0f1e] text-white' : 'text-[#6a6a6a] hover:text-[#0a0f1e]'
              }`}
            >
              <Grid3x3 size={13} /> Grid
            </button>
            <button
              onClick={() => setView('map')}
              aria-label="Map view"
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                view === 'map' ? 'bg-[#0a0f1e] text-white' : 'text-[#6a6a6a] hover:text-[#0a0f1e]'
              }`}
            >
              <MapIcon size={13} /> Map
            </button>
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2 text-[13px] font-semibold text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="priceAsc">Sort: Price low to high</option>
            <option value="priceDesc">Sort: Price high to low</option>
          </select>
        </div>
      </div>

      {/* Filter chips strip */}
      {activeChips.length > 0 && (
        <div className="max-w-[1480px] mx-auto px-6 sm:px-8 flex items-center gap-2 overflow-x-auto pb-4">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilters((f) => ({ ...f, [c.key]: EMPTY[c.key] } as Filters))}
              className="px-4 py-2 rounded-full text-[13px] font-semibold bg-[#0a0f1e] text-white border border-[#0a0f1e] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {c.label}
              <X size={12} />
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-full text-[13px] font-semibold bg-white border border-[#E5E5E5] text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB] whitespace-nowrap"
          >
            {t('propertySearch.filter.clearAll')}
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="max-w-[1480px] mx-auto px-6 sm:px-8 mt-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 pb-16">
        {/* Filter sidebar */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#0a0f1e] text-[15px]">{t('propertySearch.filter.clearAll').includes('Clear') ? 'Filters' : 'Filters'}</h2>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[#2563EB] text-[12px] font-semibold hover:underline">
                  Clear all
                </button>
              )}
            </div>

            {/* Suburb */}
            <div className="border-b border-[#F3F4F6] pb-5">
              <label className="block text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mb-3">
                {t('propertySearch.filter.suburbPlaceholder')}
              </label>
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Suburb or address"
                  value={filters.suburb}
                  onChange={(e) => setFilters((f) => ({ ...f, suburb: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E5E5E5] rounded-xl text-[13px] focus:border-[#2563EB] outline-none"
                />
              </div>
            </div>

            {/* Listing type */}
            <div className="border-b border-[#F3F4F6] py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mb-3">Listing type</p>
              <div className="flex flex-col gap-2">
                {([['', t('propertySearch.filter.any')], ['buy', t('propertySearch.filter.buy')], ['rent', t('propertySearch.filter.rent')]] as const).map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#374151]">
                    <input
                      type="radio"
                      checked={filters.intent === val}
                      onChange={() => setFilters((f) => ({ ...f, intent: val as Intent }))}
                      className="accent-[#2563EB]"
                    />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="border-b border-[#F3F4F6] py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mb-3">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters((f) => ({ ...f, bedsMin: f.bedsMin === n ? '' : n }))}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                      filters.bedsMin === n
                        ? 'bg-[#0a0f1e] text-white'
                        : 'bg-white border border-[#E5E5E5] text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]'
                    }`}
                  >
                    {n}{n === 5 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Property type */}
            <div className="border-b border-[#F3F4F6] py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mb-3">Property type</p>
              <div className="flex flex-col gap-2">
                {TYPES.map((ty) => (
                  <label key={ty} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#374151]">
                    <input
                      type="checkbox"
                      checked={filters.propertyType === ty}
                      onChange={() => setFilters((f) => ({ ...f, propertyType: f.propertyType === ty ? '' : ty }))}
                      className="accent-[#2563EB]"
                    />
                    {ty}
                  </label>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a] mb-3">Price</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : '' }))}
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-[13px] focus:border-[#2563EB] outline-none"
                />
                <span className="text-[#9CA3AF] text-[12px]">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : '' }))}
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-[13px] focus:border-[#2563EB] outline-none"
                />
              </div>
            </div>

            <button
              className="w-full bg-[#0a0f1e] text-white rounded-full py-3 font-bold text-[13px] hover:bg-white hover:text-[#0a0f1e] border border-[#0a0f1e] transition-all"
            >
              Show {properties.length} results
            </button>
          </div>
        </aside>

        {/* Results */}
        <div>
          {view === 'map' ? (
            <div className="bg-white border border-[#E5E5E5] rounded-3xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                <MapIcon size={28} strokeWidth={1.5} />
              </div>
              <h2 className="text-[20px] font-bold text-[#0a0f1e] mt-4">Map view coming soon</h2>
              <p className="text-[14px] text-[#6a6a6a] mt-2">Switch back to grid to browse listings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden">
                    <div className="aspect-[16/10] bg-[#F3F4F6] animate-pulse" />
                    <div className="p-5 space-y-2">
                      <div className="h-4 bg-[#F3F4F6] rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-[#F3F4F6] rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              ) : properties.length === 0 ? (
                <div className="col-span-full bg-white border border-[#E5E5E5] rounded-3xl p-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                    <SearchIcon size={28} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[24px] font-bold text-[#0a0f1e] mt-6">{t('propertySearch.empty.title')}</h2>
                  <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-[420px] mx-auto">{t('propertySearch.empty.desc')}</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-7 bg-white text-[#0a0f1e] border border-[#0a0f1e] rounded-full px-7 py-3 font-bold text-[13px] hover:bg-[#0a0f1e] hover:text-white transition-all inline-flex items-center gap-2"
                    >
                      {t('propertySearch.filter.clearAll')} <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ) : (
                properties.map((p) => {
                  const img = p.images?.[0] || p.image_url;
                  const hasTranslations = p.translations && typeof p.translations === 'object' && Object.keys(p.translations).length > 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/properties/${p.id}`}
                      className="group block bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden hover:border-[#2563EB] hover:shadow-[0_8px_28px_-12px_rgba(37,99,235,0.25)] transition-all"
                    >
                      <div className="aspect-[16/10] bg-[#F3F4F6] overflow-hidden relative">
                        {p.status === 'under_offer' && (
                          <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F88FF 60%, #93C5FD 100%)' }}
                          >
                            {t('propertySearch.card.underOffer')}
                          </span>
                        )}
                        {hasTranslations && (
                          <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-[#0a0f1e] backdrop-blur">
                            {t('propertySearch.card.multilingual')}
                          </span>
                        )}
                        <button
                          aria-label="Save"
                          onClick={(e) => { e.preventDefault(); }}
                          className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center transition-colors"
                        >
                          <Heart size={16} className="text-[#0a0f1e]" />
                        </button>
                        {img ? (
                          <img
                            src={img}
                            alt={p.address || t('propertySearch.card.altFallback')}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home size={32} className="text-[#D1D5DB]" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#6a6a6a]">{p.suburb}</p>
                        <p className="font-bold text-[#0a0f1e] text-[15px] mt-1 line-clamp-1">{p.address || t('propertySearch.card.addressFallback')}</p>
                        <p className="text-[20px] font-extrabold text-black tabular-nums mt-2">
                          {p.price ? `$${Number(p.price).toLocaleString('en-AU')}` : t('propertySearch.card.poa')}
                        </p>
                        <p className="text-[12px] text-[#6a6a6a] mt-1.5">
                          {p.parking
                            ? t('propertySearch.card.specsWithParking', { beds: p.beds ?? 0, baths: p.baths ?? 0, parking: p.parking })
                            : t('propertySearch.card.specs', { beds: p.beds ?? 0, baths: p.baths ?? 0 })}
                          {p.property_type ? ` · ${p.property_type}` : ''}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
