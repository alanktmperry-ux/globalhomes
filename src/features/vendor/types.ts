export interface DailyViewPoint {
  date: string;
  views: number;
  unique_views: number;
}

export interface PropertyPerformance {
  total_views: number;
  total_unique_views: number;
  views_last_n_days: number;
  total_saves: number;
  total_enquiries: number;
  open_home_attendees: number;
  days_on_market: number;
  daily_views: DailyViewPoint[];
  view_sources: Record<string, number>;
  device_split: Record<string, number>;
  enquiry_rate: number;
  save_rate: number;
}

export interface SuburbBenchmarks {
  suburb: string;
  state: string;
  avg_days_on_market: number | null;
  avg_views_first_7_days: number | null;
  median_sale_price: number | null;
  total_similar_active: number;
}

export interface VendorReportToken {
  id: string;
  property_id: string;
  agent_id: string;
  token: string;
  vendor_name?: string;
  vendor_email?: string;
  expires_at: string;
  last_viewed?: string;
  view_count: number;
  created_at: string;
}
