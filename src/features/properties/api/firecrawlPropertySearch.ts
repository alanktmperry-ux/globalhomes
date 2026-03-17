import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/shared/lib/types';

interface FirecrawlListing {
  title: string;
  price: number;
  priceFormatted: string;
  address: string;
  beds: number;
  baths: number;
  parking: number;
  sqm: number;
  imageUrl: string;
  description: string;
  propertyType: string;
  source: string;
  sourceUrl: string;
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function toProperty(listing: FirecrawlListing, index: number): Property {
  return {
    id: `google-${hashCode(listing.title + listing.address)}-${index}`,
    title: listing.title,
    address: listing.address,
    suburb: '', // extracted from address if possible
    state: '',
    country: '',
    price: listing.price,
    priceFormatted: listing.priceFormatted,
    beds: listing.beds,
    baths: listing.baths,
    parking: listing.parking,
    sqm: listing.sqm,
    imageUrl: listing.imageUrl || '/placeholder.svg',
    images: listing.imageUrl ? [listing.imageUrl] : [],
    description: listing.description,
    estimatedValue: listing.priceFormatted,
    propertyType: listing.propertyType,
    features: [],
    agent: {
      id: '',
      name: 'External Listing',
      agency: listing.source,
      phone: '',
      email: '',
      avatarUrl: '',
      isSubscribed: false,
    },
    listedDate: new Date().toISOString(),
    views: 0,
    contactClicks: 0,
    aiSummary: `Found via web search • ${listing.source}`,
  };
}

export async function firecrawlPropertySearch(query: string, limit = 8): Promise<Property[]> {
  try {
    const { data, error } = await supabase.functions.invoke('firecrawl-property-search', {
      body: { query, limit },
    });

    if (error) {
      console.warn('[firecrawlPropertySearch] Edge function error:', error.message);
      return [];
    }

    if (!data?.success || !data.listings?.length) {
      console.log('[firecrawlPropertySearch] No listings found');
      return [];
    }

    return data.listings.map((l: FirecrawlListing, i: number) => toProperty(l, i));
  } catch (err) {
    console.error('[firecrawlPropertySearch] Failed:', err);
    return [];
  }
}
