import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/lib/types';

/**
 * Maps a raw Supabase property row (with joined agents) to a Property.
 */
export function mapDbProperty(p: any): Property {
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
  };
}

/**
 * Fetches public (status = 'public') properties with agent data joined.
 */
export async function fetchPublicProperties(limit = 50): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(
      '*, agents(name, agency, phone, email, avatar_url, is_subscribed, verification_badge_level, specialization, years_experience, rating, review_count)'
    )
    .eq('status', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[fetchPublicProperties]', error.message);
    return [];
  }

  return (data ?? []).map(mapDbProperty);
}
