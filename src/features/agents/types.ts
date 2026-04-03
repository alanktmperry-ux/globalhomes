export type ReviewType = 'buyer' | 'vendor' | 'tenant' | 'landlord';
export type ReviewModeration = 'pending' | 'approved' | 'rejected';

export interface AgentReviewData {
  id: string;
  agent_id: string;
  reviewer_name: string;
  reviewer_email?: string;
  review_type: ReviewType;
  rating: number;
  title?: string;
  review_text?: string;
  suburb?: string;
  year_of_service?: number;
  verified: boolean;
  status: ReviewModeration;
  reply_text?: string;
  replied_at?: string;
  helpful_count: number;
  created_at: string;
  relationship?: string;
}

export interface AgentSearchResult {
  agent_id: string;
  slug: string;
  display_name?: string;
  avatar_url?: string;
  headline?: string;
  years_experience?: number;
  specialties?: string[];
  service_suburbs?: string[];
  agency_name?: string;
  agency_logo?: string;
  active_listings: number;
  sold_count: number;
  review_count: number;
  avg_rating?: number;
  total_count: number;
}

export interface AgentFilters {
  suburb?: string;
  state?: string;
  specialty?: string;
  minRating?: number;
  agencyId?: string;
}

export interface ReviewFormData {
  review_type: ReviewType;
  rating: number;
  title: string;
  body: string;
  suburb?: string;
  year_of_service?: number;
  reviewer_name: string;
  reviewer_email: string;
}
