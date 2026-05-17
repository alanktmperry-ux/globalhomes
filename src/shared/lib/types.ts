export type PropertyStatus = 'new' | 'off-market' | 'coming-soon' | 'listed';

export interface Property {
  id: string;
  title: string;
  address: string;
  suburb: string;
  state: string;
  country: string;
  price: number;
  priceFormatted: string;
  beds: number;
  baths: number;
  parking: number;
  sqm: number;
  imageUrl: string;
  images: string[];
  description: string;
  estimatedValue: string;
  propertyType: string;
  features: string[];
  agent: Agent;
  listedDate: string;
  views: number;
  contactClicks: number;
  lat?: number;
  lng?: number;
  status?: PropertyStatus;
  /** AI-generated one-line summary, e.g. "High-yield STR candidate near beach" */
  aiSummary?: string;
  /** AI-generated highlight tags, e.g. ["Near top schools", "Walk to station"] */
  aiHighlights?: string[];
  // Investment fields
  rentalYieldPct?: number | null;
  strPermitted?: boolean | null;
  yearBuilt?: number | null;
  councilRatesAnnual?: number | null;
  strataFeesQuarterly?: number | null;
  rentalWeekly?: number | null;
  currencyCode?: string | null;
  listingType?: string | null;
  inspectionTimes?: InspectionSlot[];
  schoolZoneTop?: boolean | null;
  schoolZoneName?: string | null;

  // Listing mode & EOI
  listing_mode?: string | null;
  eoi_close_date?: string | null;
  eoi_guide_price?: number | null;

  // Pricing
  price_guide_low?: number | null;
  price_guide_high?: number | null;

  // Auction
  auction_date?: string | null;

  // Media
  video_url?: string | null;
  virtual_tour_url?: string | null;
  floor_plan_url?: string | null;

  // Property details
  address_hidden?: boolean | null;
  is_new_build?: boolean | null;
  property_age_years?: number | null;
  estimated_weekly_rent?: number | null;
  property_type?: string | null;

  // Translations
  translations?: Record<string, unknown> | null;

  // Database aliases used in raw query results
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
  rent_per_week?: number | null;
  weekly_rent?: number | null;
  __lang?: string | null;
  commission_rate?: number | null;
  contact_clicks?: number | null;
  listed_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  is_featured?: boolean | null;
}

export interface InspectionSlot {
  date: string;   // YYYY-MM-DD
  start: string;  // HH:mm
  end: string;    // HH:mm
}

export interface Agent {
  id: string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  avatarUrl: string;
  isSubscribed: boolean;
  verificationLevel?: string;
  specialization?: string;
  yearsExperience?: number;
  rating?: number;
  reviewCount?: number;
}

export interface SearchQuery {
  text: string;
  timestamp: number;
  location?: string;
}
