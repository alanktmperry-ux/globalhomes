export interface SuburbRecord {
  id: string;
  name: string;
  slug: string;
  state: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  lga?: string;
  region?: string;
  population?: number;
  median_age?: number;
  description?: string;
}

export type PropertyType = 'house' | 'unit' | 'townhouse' | 'land';

export interface SuburbMarketStats {
  suburb: string;
  state: string;
  property_type: PropertyType;
  period_months: number;
  median_sale_price?: number;
  median_sale_price_yoy?: number;
  total_sales?: number;
  avg_days_on_market?: number;
  clearance_rate?: number;
  median_rent_pw?: number;
  median_rent_yoy?: number;
  gross_yield?: number;
  vacancy_rate?: number;
  active_listings?: number;
  new_listings_30d?: number;
  price_per_sqm?: number;
  computed_at: string;
}

export interface SuburbAmenities {
  suburb: string;
  state: string;
  schools_count: number;
  primary_schools: number;
  secondary_schools: number;
  private_schools: number;
  train_stations: number;
  tram_stops: number;
  bus_stops: number;
  supermarkets: number;
  hospitals: number;
  parks: number;
  cafes_restaurants: number;
  walk_score?: number;
  transit_score?: number;
}

export interface SuburbPricePoint {
  month: string;
  median_price: number;
  sales_count: number;
}
