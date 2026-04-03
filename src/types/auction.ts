export type AuctionStatus =
  | 'scheduled' | 'open' | 'live' | 'sold'
  | 'sold_prior' | 'sold_after' | 'passed_in' | 'withdrawn' | 'postponed';

export type BidType = 'genuine' | 'vendor' | 'opening';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
export type IdType = 'drivers_licence' | 'passport' | 'medicare_card' | 'proof_of_age_card';

export interface Auction {
  id: string;
  property_id: string;
  agent_id: string;
  auction_date: string;
  auction_time: string;
  auction_timezone: string;
  auction_location: string;
  is_online: boolean;
  online_platform_url?: string;
  auctioneer_name?: string;
  auctioneer_licence?: string;
  auctioneer_firm?: string;
  reserve_price?: number;
  reserve_met?: boolean;
  vendor_bid_limit?: number;
  opening_bid?: number;
  status: AuctionStatus;
  sold_price?: number;
  sold_at?: string;
  last_bid_amount?: number;
  total_bids: number;
  total_registered: number;
  total_active_bidders: number;
  passed_in_price?: number;
  notes?: string;
  cooling_off_waived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuctionPublicView {
  id: string;
  property_id: string;
  auction_date: string;
  auction_time: string;
  auction_timezone: string;
  auction_location: string;
  is_online: boolean;
  online_platform_url?: string;
  auctioneer_name?: string;
  auctioneer_firm?: string;
  status: AuctionStatus;
  total_registered: number;
  last_bid_amount?: number;
  total_bids?: number;
  sold_price?: number;
  result?: AuctionResultPublic;
}

export interface AuctionResultPublic {
  outcome: AuctionStatus;
  sold_price?: number;
  registered_bidders: number;
  active_bidders: number;
  total_bids: number;
}

export interface AuctionRegistration {
  id: string;
  auction_id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  id_type: IdType;
  id_number: string;
  id_expiry?: string;
  id_verified: boolean;
  id_verified_by?: string;
  id_verified_at?: string;
  paddle_number: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  registration_notes?: string;
  is_buying_for_self: boolean;
  company_name?: string;
  solicitor_name?: string;
  solicitor_firm?: string;
  solicitor_phone?: string;
  has_finance_approval: boolean;
  deposit_ready: boolean;
  attending_online: boolean;
  attended?: boolean;
  profile_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  registration_id?: string;
  bid_amount: number;
  bid_type: BidType;
  bid_number: number;
  is_winning: boolean;
  reserve_met_at_this_bid: boolean;
  bid_source: 'floor' | 'phone' | 'online';
  bid_time: string;
  bidder_label?: string;
  notes?: string;
}

export interface PreAuctionOffer {
  id: string;
  property_id: string;
  auction_id: string;
  buyer_profile_id?: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  buyer_solicitor?: string;
  offer_amount: number;
  deposit_amount?: number;
  settlement_days: number;
  settlement_date?: string;
  subject_to_finance: boolean;
  subject_to_building: boolean;
  conditions?: string;
  status: OfferStatus;
  expires_at: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  response_notes?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuctionUpdate {
  id: string;
  auction_id: string;
  update_type: string;
  message: string;
  bid_amount?: number;
  paddle_number?: number;
  created_at: string;
}
