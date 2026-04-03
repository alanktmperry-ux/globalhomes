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

export interface CmaReport {
  id: string;
  agent_id: string;
  property_id?: string;
  subject_address: string;
  subject_suburb: string;
  subject_state: string;
  subject_postcode: string;
  subject_bedrooms?: number;
  subject_bathrooms?: number;
  subject_car_spaces?: number;
  subject_land_sqm?: number;
  subject_property_type: string;
  radius_km: number;
  months_back: number;
  selected_comparable_ids: string[];
  estimated_price_low?: number;
  estimated_price_mid?: number;
  estimated_price_high?: number;
  agent_recommended_price?: number;
  agent_recommended_method?: string;
  agent_commentary?: string;
  report_title: string;
  vendor_name?: string;
  prepared_for_email?: string;
  is_shared: boolean;
  share_token: string;
  viewed_at?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}
