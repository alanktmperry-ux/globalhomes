import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, GraduationCap, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSuburbProfile } from '../hooks/useSuburbProfile';
import { useSuburbListings } from '../hooks/useSuburbListings';
import { SuburbHero } from '../components/SuburbHero';
import { SuburbPriceChart } from '../components/SuburbPriceChart';
import { SuburbPropertyTypeTabs } from '../components/SuburbPropertyTypeTabs';
import { SuburbAmenitiesPanel } from '../components/SuburbAmenitiesPanel';
import { SuburbListingsPreview } from '../components/SuburbListingsPreview';
import { SuburbInvestorSnapshot } from '../components/SuburbInvestorSnapshot';
import { PropertyMap } from '@/features/properties/components/PropertyMap';
import { Property } from '@/shared/lib/types';

export default function SuburbProfilePage() {
  const { state, slug } = useParams<{ state: string; slug: string }>();
  const { suburb, stats, getStats, amenities, priceHistory, loading, error } = useSuburbProfile(slug!, state!);
  const suburbName = suburb?.name ?? slug!.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const stateUpper = state!.toUpperCase();
  const { active, recentSales } = useSuburbListings(suburbName, stateUpper);

  const houseStats = getStats('house');

  const mappableListings = useMemo<Property[]>(() =>
    active
      .filter((p: any) => p.lat && p.lng)
      .map((p: any) => ({
        id: p.id,
        title: p.address,
        address: p.address,
        suburb: suburbName,
        state: stateUpper,
        country: 'Australia',
        price: p.price ?? 0,
        priceFormatted: p.price_formatted ?? '',
        beds: p.beds ?? 0,
        baths: p.baths ?? 0,
        parking: p.parking ?? 0,
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
        lat: p.lat,
        lng: p.lng,
        listingType: p.listing_type,
      })),
    [active, suburbName, stateUpper],
  );
  // Nearby schools
  const [nearbySchools, setNearbySchools] = useState<any[]>([]);
  useEffect(() => {
    if (!suburbName || !stateUpper) return;
    supabase
      .from('schools')
      .select('id, name, type, sector, icsea, state')
      .ilike('suburb', suburbName)
      .ilike('state', stateUpper)
      .order('enrolment', { ascending: false })
      .limit(8)
      .then(({ data }) => setNearbySchools(data ?? []));
  }, [suburbName, stateUpper]);

  // Nearby suburbs
  const [nearbySuburbs, setNearbySuburbs] = useState<any[]>([]);
  useEffect(() => {
    if (!suburbName || !stateUpper) return;
    supabase
      .from('suburbs')
      .select('name, slug, state')
      .eq('state', stateUpper)
      .neq('name', suburbName)
      .limit(6)
      .then(({ data }) => setNearbySuburbs(data ?? []));
  }, [suburbName, stateUpper]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Could not load suburb data.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const metaDesc = houseStats?.median_sale_price
    ? `${suburbName}, ${stateUpper} property market: median house price $${houseStats.median_sale_price.toLocaleString()}, ${houseStats.total_sales ?? 0} sales in the past 12 months. View listings, sold prices, schools, and suburb data on ListHQ.`
    : `Explore properties, sold prices, schools, and suburb data for ${suburbName}, ${stateUpper} on ListHQ.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${suburbName}, ${stateUpper}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: suburbName,
      addressRegion: stateUpper,
      addressCountry: 'AU',
      ...(suburb?.postcode && { postalCode: suburb.postcode }),
    },
    ...(suburb?.lat &&
      suburb.lng && {
        geo: { '@type': 'GeoCoordinates', latitude: suburb.lat, longitude: suburb.lng },
      }),
  };

  return (
    <>
      <Helmet>
        <title>{suburbName}, {stateUpper} — Property Market Data</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={`https://listhq.com.au/suburb/${state}/${slug}`} />
        <meta property="og:title" content={`${suburbName}, ${stateUpper} — Property Market | ListHQ`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <SuburbHero suburb={suburb} suburbName={suburbName} stateUpper={stateUpper} stats={houseStats} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Map */}
        {suburb?.lat && suburb?.lng && mappableListings.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Properties in {suburbName}
            </h2>
            <PropertyMap
              properties={mappableListings}
              onPropertySelect={() => {}}
              centerOn={{ lat: suburb.lat, lng: suburb.lng }}
              initialZoom={14}
              height="400px"
              hideDrawingTools
              hideSearchArea
              hideGeolocation
            />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />
                Active listings ({mappableListings.length})
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={14} />
                Schools ({nearbySchools.length})
              </span>
            </div>
          </section>
        )}

        {/* Price Chart */}
        {priceHistory.length > 0 && (
          <section>
            <SuburbPriceChart data={priceHistory} suburbName={suburbName} />
          </section>
        )}

        {/* Market stats by property type */}
        {stats.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Market Statistics</h2>
            <SuburbPropertyTypeTabs allStats={stats} />
          </section>
        )}

        {/* Investor Snapshot */}
        {houseStats && (
          <section>
            <SuburbInvestorSnapshot stats={houseStats} suburbName={suburbName} />
          </section>
        )}

        {/* Active Listings Preview */}
        {active.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Properties for Sale in {suburbName}
              </h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {active.length} active
              </span>
            </div>
            <SuburbListingsPreview listings={active} mode="active" suburbName={suburbName} state={stateUpper} />
          </section>
        )}

        {/* Recently Sold */}
        {recentSales.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Recent Sales in {suburbName}
            </h2>
            <SuburbListingsPreview listings={recentSales} mode="sold" suburbName={suburbName} state={stateUpper} />
          </section>
        )}

        {/* Schools */}
        {nearbySchools.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap size={18} className="text-primary" />
              Schools in {suburbName}
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
                    {school.type?.charAt(0).toUpperCase()}{school.type?.slice(1)} · {school.sector?.charAt(0).toUpperCase()}{school.sector?.slice(1)}
                    {school.icsea ? ` · ICSEA ${school.icsea}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Amenities */}
        {amenities && (
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">Amenities &amp; Lifestyle</h2>
            <SuburbAmenitiesPanel amenities={amenities} />
          </section>
        )}

        {/* SEO Text Block */}
        <section className="pt-8 border-t border-border">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Living in {suburbName}, {stateUpper}
          </h2>
          {suburb?.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{suburb.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {suburbName} is a suburb in {stateUpper}, Australia
              {suburb?.postcode ? ` (postcode ${suburb.postcode})` : ''}.
              {houseStats?.median_sale_price
                ? ` The median house price is $${houseStats.median_sale_price.toLocaleString()}, with ${houseStats.total_sales ?? 'a number of'} properties sold in the past 12 months.`
                : ''}
              {houseStats?.gross_yield
                ? ` Investors are attracted by a gross rental yield of approximately ${houseStats.gross_yield.toFixed(1)}%.`
                : ''}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Data updated{' '}
            {houseStats
              ? new Date(houseStats.computed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'regularly'}
            . Source: ListHQ property listings and sales records.
          </p>
        </section>

        {/* Nearby Suburbs */}
        {nearbySuburbs.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Explore Nearby Suburbs</h2>
            <div className="flex flex-wrap gap-2">
              {nearbySuburbs.map((s: any) => (
                <Link
                  key={s.slug + s.state}
                  to={`/suburb/${s.state.toLowerCase()}/${s.slug}`}
                  className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:border-primary/40 transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
