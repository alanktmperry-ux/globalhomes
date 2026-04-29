export type HaloIntent = 'buy' | 'rent';

export type HaloTimeframe = 'ready_now' | '3_to_6_months' | '6_to_12_months' | 'exploring';

export type HaloFinanceStatus = 'pre_approved' | 'arranging' | 'cash_buyer' | 'not_started';

export type HaloStatus = 'active' | 'paused' | 'expired' | 'fulfilled' | 'deleted';

export interface Halo {
  id: string;
  seeker_id: string;
  intent: HaloIntent;
  property_types: string[];
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  car_spaces_min: number | null;
  suburbs: string[];
  suburb_flexibility: boolean;
  budget_min: number | null;
  budget_max: number;
  timeframe: HaloTimeframe;
  finance_status: HaloFinanceStatus;
  description: string | null;
  deal_breakers: string | null;
  must_haves: string[];
  preferred_language: string;
  referral_source: string | null;
  status: HaloStatus;
  expires_at: string;
  expiry_reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export type HaloFormData = Omit<
  Halo,
  'id' | 'seeker_id' | 'status' | 'expires_at' | 'expiry_reminder_sent' | 'created_at' | 'updated_at'
>;

export const TIMEFRAME_LABELS: Record<HaloTimeframe, string> = {
  ready_now: 'Ready now',
  '3_to_6_months': '3 to 6 months',
  '6_to_12_months': '6 to 12 months',
  exploring: 'Just exploring',
};

export const FINANCE_LABELS: Record<HaloFinanceStatus, string> = {
  pre_approved: 'Pre-approved',
  arranging: 'Arranging finance',
  cash_buyer: 'Cash buyer',
  not_started: 'Not started',
};

export const PROPERTY_TYPE_OPTIONS = ['House', 'Apartment', 'Townhouse', 'Villa', 'Land', 'Commercial', 'Any'] as const;
export const MUST_HAVE_OPTIONS = [
  'Pool',
  'Granny flat',
  'Study',
  'New build',
  'Period home',
  'North-facing',
  'Large land',
  'Pet-friendly',
  'Off-street parking',
] as const;
