import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { MapPin, TrendingUp, Home, Search, Loader2, GraduationCap } from 'lucide-react';
import { ComparableSalesSEOBlock } from '@/components/comparable/ComparableSalesSEOBlock';

const STATE_NAMES: Record<string, string> = {
  vic: 'Victoria', nsw: 'New South Wales', qld: 'Queensland',
  wa: 'Western Australia', sa: 'South Australia', tas: 'Tasmania',
  act: 'Australian Capital Territory', nt: 'Northern Territory',
};

function unslug(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SuburbPage() {
  const { state, suburb } = useParams<{ state: string; suburb: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedProperties();
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState<{ count: number; medianPrice: number | null; avgBeds: number | null }>({ count: 0, medianPrice: null, avgBeds: null });
  const [loading, setLoading] = useState(true);
  const [nearbySchools, setNearbySchools] = useState<any[]>([]);
  const [soldStats, setSoldStats] = useState<any>(null);

  const suburbDisplay = unslug(suburb ?? '');
  const stateUpper = state?.toUpperCase() ?? '';
  const stateFull = STATE_NAMES[state?.toLowerCase() ?? ''] ?? stateUpper;
  const isRent = window.location.pathname.startsWith('/rent');

  useEffect(() => {
    if (!suburb || !state) return;
    supabase
      .from('properties')
      .select('id, title, address, suburb, state, price, price_formatted, property_type, beds, baths, parking, images, image_url, slug, listing_type, lat, lng')
      .ilike('suburb', `%${unslug(suburb)}%`)
      .ilike('state', `%${stateUpper}%`)
      .eq('is_active', true)
      .eq('status', 'public')
      .order('created_at', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        const props = (data ?? []).filter((p: any) => isRent
          ? (p.listing_type === 'rent' || p.listing_type === 'rental')
          : (p.listing_type === 'sale' || p.listing_type === 'for_sale' || !p.listing_type)
        );
        setProperties(props);
        const prices = props.map((p: any) => p.price).filter(Boolean).sort((a: number, b: number) => a - b);
        const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
        const avgBeds = props.length ? Math.round(props.reduce((s: number, p: any) => s + (p.beds ?? 0), 0) / props.length) : null;
        setStats({ count: props.length, medianPrice: median, avgBeds });
        setLoading(false);
      });

    // Fetch schools in this suburb
    supabase
      .from('schools')
      .select('id, name, type, sector, icsea, state')
      .ilike('suburb', `%${unslug(suburb)}%`)
      .ilike('state', `%${stateUpper}%`)
      .order('enrolment', { ascending: false })
      .limit(8)
      .then(({ data }) => setNearbySchools(data ?? []));

    // Fetch sold stats for suburb
    supabase.rpc('suburb_sold_stats', {
      p_suburb: unslug(suburb),
      p_state: stateUpper,
      p_bedrooms: 3,
      p_months: 12,
    }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setSoldStats(row ?? null);
    });
  }, [suburb, state]);

  const title = `${isRent ? 'Rental Properties' : 'Properties for Sale'} in ${suburbDisplay} ${stateUpper} | ListHQ`;
  const description = `Browse ${stats.count > 0 ? stats.count + ' ' : ''}${isRent ? 'rental' : ''} properties ${isRent ? '' : 'for sale '}in ${suburbDisplay}, ${stateFull}. ${stats.medianPrice ? 'Median price $' + (stats.medianPrice / 1e6).toFixed(2) + 'M. ' : ''}Updated daily on ListHQ.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://listhq.com.au/${isRent ? 'rent' : 'buy'}/${state}/${suburb}`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SearchResultsPage',
          name: title,
          description,
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://listhq.com.au' },
              { '@type': 'ListItem', position: 2, name: stateFull, item: `https://listhq.com.au/buy/${state}` },
              { '@type': 'ListItem', position: 3, name: suburbDisplay },
            ],
          },
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', '[data-speakable]'],
          },
        })}</script>
      </Helmet>

      <div className="max-w-6xl mx-auto w-full px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <span>{stateUpper}</span>
          <span>/</span>
          <span className="text-foreground font-medium">{suburbDisplay}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {isRent ? 'Rentals' : 'Properties for Sale'} in {suburbDisplay}, {stateUpper}
          </h1>
          {!loading && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {stats.count > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Home size={14} /> {stats.count} listing{stats.count !== 1 ? 's' : ''}
                </span>
              )}
              {stats.medianPrice && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp size={14} /> Median ${(stats.medianPrice / 1e6).toFixed(2)}M
                </span>
              )}
              {stats.avgBeds && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Avg {stats.avgBeds} bed
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI search CTA */}
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card mb-8">
          <Search size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Search smarter with AI</p>
            <p className="text-xs text-muted-foreground">Try "3 bed house in {suburbDisplay} under $1.2M"</p>
          </div>
          <button
            onClick={() => navigate(`/?location=${encodeURIComponent(suburbDisplay + ' ' + stateUpper)}`)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            Search
          </button>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No listings found in {suburbDisplay}</p>
            <button onClick={() => navigate('/')} className="mt-3 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Browse all listings
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p: any, i: number) => (
              <PropertyCard
                key={p.id}
                property={{
                  id: p.id,
                  title: p.title || p.address,
                  address: p.address,
                  suburb: p.suburb,
                  state: p.state,
                  country: 'Australia',
                  price: p.price,
                  priceFormatted: p.price_formatted,
                  beds: p.beds,
                  baths: p.baths,
                  parking: p.parking,
                  sqm: 0,
                  imageUrl: p.image_url || p.images?.[0] || '',
                  images: p.images || [],
                  description: '',
                  estimatedValue: '',
                  propertyType: p.property_type || 'House',
                  features: [],
                  agent: { id: '', name: '', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
                  listedDate: '',
                  views: 0,
                  contactClicks: 0,
                  listingType: p.listing_type,
                }}
                isSaved={isSaved(p.id)}
                onToggleSave={toggleSaved}
                onSelect={() => navigate(`/property/${p.slug ?? p.id}`)}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Schools in area */}
        {nearbySchools.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap size={18} className="text-primary" />
              Schools in {suburbDisplay}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbySchools.map((school: any) => (
                <Link
                  key={school.id}
                  to={`/school/${state}/${school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{school.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {school.type.charAt(0).toUpperCase() + school.type.slice(1)} · {school.sector.charAt(0).toUpperCase() + school.sector.slice(1)}
                    {school.icsea ? ` · ICSEA ${school.icsea}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comparable Sales SEO Block */}
        {!isRent && soldStats && (
          <ComparableSalesSEOBlock
            suburb={suburbDisplay}
            state={stateUpper}
            stats={soldStats}
            bedrooms={3}
          />
        )}

        {/* SEO text block */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">About {suburbDisplay}, {stateFull}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {suburbDisplay} is a suburb in {stateFull}, Australia. ListHQ lists all active {isRent ? 'rental' : 'for-sale'} properties
            in {suburbDisplay} updated daily from local agents. Use our AI-powered voice search to find properties that match your
            exact criteria — bedrooms, budget, property type and more.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            <Link to={`/buy/${state}`} className="text-primary hover:underline">
              All {stateFull} properties
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
