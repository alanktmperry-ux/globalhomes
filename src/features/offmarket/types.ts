export type ListingMode = 'public' | 'off_market' | 'eoi';
export type FinanceStatus = 'cash' | 'pre_approved' | 'conditional' | 'not_arranged';
export type EOIStatus =
  | 'submitted' | 'under_review' | 'shortlisted'
  | 'accepted' | 'declined' | 'withdrawn';

export interface ExpressionOfInterest {
  id: string;
  property_id: string;
  buyer_id: string;
  offered_price: number;
  finance_status: FinanceStatus;
  settlement_days?: number;
  conditions?: string;
  cover_letter?: string;
  status: EOIStatus;
  agent_notes?: string;
  submitted_at: string;
  updated_at: string;
  buyer?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    pre_approval_verified: boolean | null;
    pre_approval_amount: number | null;
  };
}

export interface OffmarketSubscription {
  id: string;
  buyer_id: string;
  suburb: string;
  state: string;
  min_price?: number | null;
  max_price?: number | null;
  min_bedrooms?: number | null;
  property_types: string[];
  created_at: string;
}
