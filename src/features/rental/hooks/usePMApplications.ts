import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ApplicationStatus } from '../types';

interface PMApplication {
  id: string;
  status: string;
  created_at: string;
  applicant_name?: string;
  property_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  annual_income?: number;
  employment_status?: string;
  move_in_date?: string;
  occupants?: number;
  has_pets?: boolean;
  submitted_at?: string;
  bond_collected_at?: string;
  bond_lodged_at?: string;
  bond_lodgement_ref?: string;
  [key: string]: unknown;
}

export function usePMApplications(propertyId: string) {
  const [apps, setApps] = useState<PMApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
    const channel = supabase
      .channel(`rental-apps-${propertyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rental_applications',
        filter: `property_id=eq.${propertyId}`,
      }, () => fetchApps())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [propertyId]);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await (supabase as any)
        .from('rental_applications')
        .select('*')
        .eq('property_id', propertyId)
        .order('submitted_at', { ascending: false });
      if (queryError) throw queryError;
      setApps(data ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: string, status: ApplicationStatus, notes?: string) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('rental_applications')
        .update({ status, ...(notes ? { pm_notes: notes } : {}) })
        .eq('id', appId);
      if (updateError) throw updateError;
      fetchApps();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update application status');
    }
  };

  return { apps, loading, error, updateStatus };
}
