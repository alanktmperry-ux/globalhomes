import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RentalApplication, CoApplicant } from '../types';
import { getErrorMessage } from '@/shared/lib/errorUtils';

export interface ApplicationFormData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  current_address: string;
  time_at_address: string;
  employment_status: string;
  employer_name: string;
  annual_income: number;
  previous_landlord_name: string;
  previous_landlord_contact: string;
  reason_for_leaving: string;
  move_in_date: string;
  lease_term_months: number;
  occupants: number;
  has_pets: boolean;
  pet_description: string;
  additional_notes: string;
  co_applicants: CoApplicant[];
  declaration_accepted: boolean;
}

export function useRentalApplication(propertyId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitApplication = async (formData: ApplicationFormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ref = `RA-${Date.now().toString(36).toUpperCase()}`;

      const { error: err } = await (supabase as any)
        .from('rental_applications')
        .insert({
          property_id: propertyId,
          applicant_id: user?.id ?? null,
          user_id: user?.id ?? null,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          current_address: formData.current_address,
          time_at_address: formData.time_at_address,
          employment_status: formData.employment_status,
          employer_name: formData.employer_name || null,
          annual_income: formData.annual_income || null,
          previous_landlord_name: formData.previous_landlord_name || null,
          previous_landlord_contact: formData.previous_landlord_contact || null,
          reason_for_leaving: formData.reason_for_leaving || null,
          move_in_date: formData.move_in_date || null,
          lease_term_months: formData.lease_term_months || null,
          occupants: formData.occupants,
          has_pets: formData.has_pets,
          pet_description: formData.pet_description || null,
          additional_notes: formData.additional_notes || null,
          co_applicants: formData.co_applicants,
          declaration_accepted: true,
          pm_notes: null,
          reference_number: ref,
          status: 'submitted',
        });
      if (err) throw err;
      setSubmitted(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, submitted, submitApplication };
}
