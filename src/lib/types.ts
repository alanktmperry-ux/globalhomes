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
}

export interface Agent {
  id: string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  avatarUrl: string;
  isSubscribed: boolean;
}

export interface SearchQuery {
  text: string;
  timestamp: number;
  location?: string;
}
