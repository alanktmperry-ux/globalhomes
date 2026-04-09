export interface ComparableSaleRecord {
  id: string;
  property_id?: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  car_spaces?: number;
  land_size_sqm?: number;
  floor_area_sqm?: number;
  sold_price: number;
  price_per_sqm?: number;
  sold_date: string;
  days_on_market?: number;
  sale_method: 'auction' | 'private_treaty' | 'expression_of_interest' | 'set_date_sale';
  auction_clearance?: boolean;
  discount_pct?: number;
  agency_name?: string;
  is_verified: boolean;
  similarity_score?: number;
}

export interface SuburbSummary {
  suburb: string;
  state: string;
  property_type: string;
  median_price_90d?: number;
  sales_volume_90d?: number;
  median_dom_90d?: number;
  median_price_12m?: number;
  sales_volume_12m?: number;
  auction_clearance_12m?: number;
  active_listings?: number;
  yoy_change_pct?: number;
}

export interface SuburbPriceTrendPoint {
  period_month: string;
  median_price?: number;
  total_sales?: number;
  median_dom?: number;
  clearance_rate?: number;
}

