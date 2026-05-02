import { Helmet } from 'react-helmet-async';

interface PropertySEOHeadProps {
  property: any;
  agent?: any;
}

const APP_URL = 'https://listhq.com.au';

export function PropertySEOHead({ property, agent }: PropertySEOHeadProps) {
  const img = (property.images && property.images[0]) || property.image_url;
  const price = property.price_formatted ?? (property.price ? `$${Number(property.price).toLocaleString('en-AU')}` : 'Price on request');
  const isRent = property.listing_type === 'rent' || property.listing_type === 'rental';

  const title = `${price}${isRent ? '/wk' : ''} · ${property.beds > 0 ? property.beds + ' bed ' : ''}${property.property_type ?? 'Property'} in ${property.suburb ?? ''} ${property.state ?? ''}`;
  const description = property.description
    ? property.description.slice(0, 160)
    : `${price} · ${[property.beds && property.beds + ' bed', property.baths && property.baths + ' bath', property.suburb, property.state].filter(Boolean).join(' · ')}. View on ListHQ.`;
  const url = `${APP_URL}/property/${property.slug ?? property.id}`;

  const schemaType = (() => {
    if (isRent) return 'Accommodation';
    const t = (property.property_type ?? '').toLowerCase();
    if (t.includes('apartment') || t.includes('unit') || t.includes('flat')) return 'Apartment';
    if (t.includes('townhouse') || t.includes('villa') || t.includes('terrace')) return 'Townhouse';
    if (t.includes('land') || t.includes('block')) return 'LandLot';
    return 'SingleFamilyResidence';
  })();

  const schema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: property.title ?? title,
    description,
    url,
    image: img ? [img] : undefined,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency_code || 'AUD',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.suburb,
      addressRegion: property.state,
      postalCode: property.postcode,
      addressCountry: property.country || 'AU',
    },
    numberOfRooms: property.beds,
    numberOfBathroomsTotal: property.baths || undefined,
    parkingSpaces: property.parking || undefined,
    amenityFeature: property.features && Array.isArray(property.features) && property.features.length > 0
      ? property.features.map((f: string) => ({
          '@type': 'LocationFeatureSpecification',
          name: f,
          value: true,
        }))
      : undefined,
    datePosted: property.listed_date || undefined,
    floorSize: property.land_size ? { '@type': 'QuantitativeValue', value: property.land_size, unitCode: 'MTK' } : undefined,
    ...(property.virtual_tour_url ? { virtualTourUrl: property.virtual_tour_url } : {}),
    ...(agent ? {
      agent: {
        '@type': 'RealEstateAgent',
        name: agent.name || agent.full_name,
        image: agent.avatar_url || agent.avatarUrl,
      }
    } : {}),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '[data-speakable]'],
    },
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {img && <meta property="og:image" content={img} />}
      {img && <meta property="og:image:width" content="1200" />}
      {img && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="ListHQ" />
      <meta property="og:locale" content="en_AU" />

      <meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {img && <meta name="twitter:image" content={img} />}

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
