export interface FeaturedListing {
  id: string;
  title: string;
  address: string;
  suburb: string;
  state: string | null;
  priceFormatted: string | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  imageUrl: string;
  boostTier: 'premier' | 'featured';
  slotPosition: number; // 1–5
  listingType: string | null;
  agentId: string | null;
}
