import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { usePropertiesInCatchment } from '@/hooks/usePropertiesInCatchment';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { GraduationCap, MapPin, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function SchoolPage() {
  const { state, slug } = useParams<{ state: string; slug: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedProperties();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const schoolNameFromSlug = slug ? slugToName(slug) : '';
  const stateUpper = (state ?? '').toUpperCase();

  useEffect(() => {
    if (!slug || !state) return;
    supabase
      .from('schools')
      .select('*')
      .ilike('name', `%${schoolNameFromSlug}%`)
      .eq('state', stateUpper)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSchool(data);
        setLoading(false);
      });
  }, [slug, state]);

  const { properties, loading: propsLoading } = usePropertiesInCatchment(school?.id ?? null);

  const title = `${school?.name ?? schoolNameFromSlug} Catchment Zone — Properties for Sale | ListHQ`;
  const description = `Browse properties in the ${school?.name ?? schoolNameFromSlug} catchment zone in ${school?.suburb ?? ''}, ${stateUpper}. ${properties.length} homes currently for sale.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={`https://listhq.com.au/school/${state}/${slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "School",
          "name": school?.name ?? schoolNameFromSlug,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": school?.suburb,
            "addressRegion": stateUpper,
            "addressCountry": "AU",
          },
          ...(school?.website_url ? { "url": school.website_url } : {}),
        })}</script>
      </Helmet>

      <div className="max-w-6xl mx-auto w-full px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={14} /> Back
        </button>

        {/* School header */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-card mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
                {loading ? schoolNameFromSlug : (school?.name ?? schoolNameFromSlug)}
              </h1>
              {school && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {school.suburb}, {stateUpper}
                  </span>
                  <span>
                    {school.type.charAt(0).toUpperCase() + school.type.slice(1)} · {school.sector.charAt(0).toUpperCase() + school.sector.slice(1)}
                  </span>
                  {school.icsea && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      ICSEA {school.icsea}
                    </span>
                  )}
                  {school.website_url && (
                    <a href={school.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      School website <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {school?.icsea && (
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              <strong>About ICSEA {school.icsea}:</strong>{' '}
              {school.icsea >= 1100
                ? 'Above average socio-educational advantage. Students typically have access to strong educational resources.'
                : school.icsea >= 950
                ? 'Near the national average for socio-educational advantage (median: 1000).'
                : 'Below the national average. May have access to additional government funding and support.'}
              {' '}ICSEA measures community factors — it is not a direct measure of teaching quality.
            </p>
          )}
        </div>

        {/* Properties */}
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-1">
            Properties in the {school?.name ?? schoolNameFromSlug} catchment zone
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {propsLoading
              ? 'Loading properties...'
              : `${properties.length} active listing${properties.length !== 1 ? 's' : ''} inside this catchment zone`}
          </p>

          {propsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : properties.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map(({ property_id, property: p }) => (
                <PropertyCard
                  key={property_id}
                  property={{
                    id: p.id,
                    title: p.address,
                    address: p.address,
                    suburb: p.suburb,
                    state: p.state,
                    country: 'Australia',
                    price: p.price,
                    priceFormatted: p.price_formatted || undefined,
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
                  index={0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-display font-semibold text-foreground">No active listings in this catchment zone</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon or set up a search alert</p>
              {school?.suburb && (
                <Link
                  to={`/buy/${state}/${school.suburb.toLowerCase().replace(/\s+/g, '-')}`}
                  className="mt-4 inline-block px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Browse all {school.suburb} listings
                </Link>
              )}
            </div>
          )}
        </div>

        {/* SEO text */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Buying in the {school?.name ?? schoolNameFromSlug} catchment
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Properties within the {school?.name ?? schoolNameFromSlug} catchment zone in{' '}
            {school?.suburb ?? ''}, {stateUpper} are in high demand among families with
            school-age children. Catchment zone boundaries are set by the state education
            department and determine which students are guaranteed enrolment at the school.
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            The catchment boundary shown above is indicative only. Boundaries can change
            annually. Always confirm your eligibility directly with the school before
            purchasing a property based on catchment.
          </p>
        </div>
      </div>
    </>
  );
}
