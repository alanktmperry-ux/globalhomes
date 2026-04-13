import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';
import type { Database } from '@/integrations/supabase/types';

type PropertyDbRow = Database['public']['Tables']['properties']['Row'];
type AgentDbRow = Database['public']['Tables']['agents']['Row'];

/** A property row with the joined agent relation from a select query. */
type PropertyWithAgent = PropertyDbRow & {
  agents: Partial<AgentDbRow> | null;
};

/**
 * Maps a raw Supabase property row (with joined agents) to a Property.
 */
export function mapDbProperty(p: PropertyWithAgent): Property {
  return {
    id: p.id,
    title: p.title,
    address: p.address,
    suburb: p.suburb,
    state: p.state,
    country: p.country,
    price: p.price,
    priceFormatted: p.price_formatted,
    beds: p.beds,
    baths: p.baths,
    parking: p.parking,
    sqm: p.sqm,
    imageUrl:
      p.image_url ||
      p.images?.[0] ||
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    images: p.images || (p.image_url ? [p.image_url] : []),
    description: p.description || '',
    estimatedValue: p.estimated_value || '',
    propertyType: p.property_type || 'House',
    features: p.features || [],
    agent: p.agents
      ? {
          id: p.agent_id || '',
          name: p.agents.name || 'Agent',
          agency: p.agents.agency || '',
          phone: p.agents.phone || '',
          email: p.agents.email || '',
          avatarUrl: p.agents.avatar_url || '',
          isSubscribed: p.agents.is_subscribed || false,
          verificationLevel: p.agents.verification_badge_level || 'email',
          specialization: p.agents.specialization || undefined,
          yearsExperience: p.agents.years_experience || undefined,
          rating: p.agents.rating || 0,
          reviewCount: p.agents.review_count || 0,
        }
      : {
          id: '',
          name: 'Private Seller',
          agency: '',
          phone: '',
          email: '',
          avatarUrl: '',
          isSubscribed: false,
        },
    listedDate: p.listed_date || p.created_at,
    views: p.views,
    contactClicks: p.contact_clicks,
    lat: p.lat || undefined,
    lng: p.lng || undefined,
    status: 'listed' as const,
    rentalYieldPct: p.rental_yield_pct,
    strPermitted: p.str_permitted,
    yearBuilt: p.year_built,
    councilRatesAnnual: p.council_rates_annual,
    strataFeesQuarterly: p.strata_fees_quarterly,
    rentalWeekly: p.rental_weekly,
    currencyCode: p.currency_code,
    listingType: p.listing_type || null,
  };
}

const PROPERTIES_WITH_AGENTS =
  '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)';

/**
 * Searches agent listings by keyword matching against title, address, suburb, state, description.
 * Results are ordered: subscribed agents first, then by recency.
 */
export async function searchAgentListings(
  query: string,
  limit = 50,
  listingType?: 'sale' | 'rent',
  structured?: {
    beds?: number;
    baths?: number;
    priceMin?: number;
    priceMax?: number;
    suburb?: string;
    propertyType?: string;
    features?: string[];
  }
): Promise<Property[]> {
  const sanitizedQuery = query.trim().slice(0, 200);
  const words = sanitizedQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 10);

  if (words.length === 0 && !structured?.suburb) return [];

  // When a structured suburb is provided, narrow keyword matching to address/suburb only
  // to prevent noise words like "bedroom" or "under" matching descriptions
  const searchColumns = structured?.suburb
    ? ['address', 'suburb']
    : ['title', 'address', 'suburb', 'state', 'description', 'property_type'];

  const orClauses = words
    .flatMap((w) =>
      searchColumns.map((col) => `${col}.ilike.%${w}%`)
    )
    .join(',');

  let dbQuery = supabase
    .from('properties')
    .select(PROPERTIES_WITH_AGENTS)
    .eq('is_active', true)
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Combine all OR conditions into a single .or() call to avoid
  // PostgREST conflicts where a second .or() silently overwrites the first.
  const allOrParts: string[] = [];

  if (orClauses) {
    allOrParts.push(orClauses);
  }

  if (structured?.suburb) {
    allOrParts.push(`suburb.ilike.%${structured.suburb}%`);
    allOrParts.push(`address.ilike.%${structured.suburb}%`);
  }

  if (allOrParts.length > 0) {
    dbQuery = dbQuery.or(allOrParts.join(','));
  }

  // Apply structured filters
  if (structured?.beds) {
    dbQuery = dbQuery.gte('beds', structured.beds);
  }
  if (structured?.baths) {
    dbQuery = dbQuery.gte('baths', structured.baths);
  }
  if (structured?.priceMin) {
    dbQuery = dbQuery.gte('price', structured.priceMin);
  }
  if (structured?.priceMax) {
    dbQuery = dbQuery.lte('price', structured.priceMax);
  }
  if (structured?.propertyType) {
    dbQuery = dbQuery.ilike('property_type', `%${structured.propertyType}%`);
  }

  // Listing type: use .eq or .filter instead of .or() to avoid conflicting with the above .or()
  if (listingType === 'rent') {
    dbQuery = dbQuery.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    dbQuery = dbQuery.filter('listing_type', 'in', '("sale",null)');
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('[searchAgentListings]', error.message);
    return [];
  }

  // Sort: subscribed agents first
  const mapped = (data ?? []).map(mapDbProperty);
  return mapped.sort((a, b) => {
    if (a.agent.isSubscribed && !b.agent.isSubscribed) return -1;
    if (!a.agent.isSubscribed && b.agent.isSubscribed) return 1;
    return 0;
  });
}

/**
 * Fetches public (status = 'public') properties with agent data joined.
 */
export async function fetchPublicProperties(limit = 50, listingType?: 'sale' | 'rent'): Promise<Property[]> {
  let query = supabase
    .from('properties')
    .select(
      '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)'
    )
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (listingType === 'rent') {
    query = query.eq('listing_type', 'rent');
  } else if (listingType === 'sale') {
    query = query.or('listing_type.eq.sale,listing_type.is.null');
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchPublicProperties]', error.message);
    return [];
  }

  return (data ?? []).map(mapDbProperty);
}
