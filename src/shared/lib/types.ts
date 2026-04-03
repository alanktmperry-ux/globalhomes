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
