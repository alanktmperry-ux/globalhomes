export type EmploymentStatus =
  | 'full_time' | 'part_time' | 'casual' | 'self_employed'
  | 'retired' | 'student' | 'unemployed';

export type ApplicationStatus =
  | 'submitted' | 'under_review' | 'shortlisted'
  | 'approved' | 'declined' | 'withdrawn';

export type FurnishedStatus = 'unfurnished' | 'furnished' | 'partially_furnished';

export interface RentalApplication {
  id: string;
  property_id: string;
  applicant_id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  current_address?: string;
  time_at_address?: string;
  employment_status?: EmploymentStatus;
  employer_name?: string;
  annual_income?: number;
  income_verified: boolean;
  previous_landlord_name?: string;
  previous_landlord_contact?: string;
  reason_for_leaving?: string;
  move_in_date?: string;
  lease_term_months?: number;
  occupants: number;
  has_pets: boolean;
  pet_description?: string;
  additional_notes?: string;
  co_applicants: CoApplicant[];
  status: ApplicationStatus;
  pm_notes?: string;
  submitted_at: string;
  updated_at: string;
}

export interface CoApplicant {
  name: string;
  email: string;
  income?: number;
  employment_status?: string;
}

export interface RentalProperty {
  id: string;
  address: string;
  suburb: string;
  state: string;
  rental_weekly?: number;
  bond_amount?: number;
  available_from?: string;
  lease_term?: string;
  pets_allowed: boolean;
  furnished: FurnishedStatus | boolean | null;
  smoking_allowed: boolean;
  utilities_included: string[];
  beds?: number;
  baths?: number;
  parking?: number;
  property_type?: string;
  images?: string[];
  listing_status?: string;
  listing_mode?: string;
  description?: string;
  slug?: string;
  lat?: number;
  lng?: number;
  agent_id?: string;
}
