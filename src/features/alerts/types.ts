export type AlertFrequency = 'instant' | 'daily' | 'weekly' | 'off';

export interface SavedSearchRecord {
  id: string;
  user_id: string;
  name: string;
  suburbs: string[];
  states: string[];
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  property_types: string[];
  listing_status?: string;
  has_virtual_tour?: boolean;
  min_land_sqm?: number;
  max_land_sqm?: number;
  listing_mode?: string;
  keywords?: string;
  alert_frequency: AlertFrequency;
  last_alerted_at?: string;
  new_match_count: number;
  created_at: string;
  updated_at: string;
}

export interface PriceChange {
  id: string;
  property_id: string;
  old_price: number;
  new_price: number;
  change_pct: number;
  changed_at: string;
}
