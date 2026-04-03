import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ApplicationStatus } from '../types';

export function usePMApplications(propertyId: string) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { data } = await (supabase as any)
      .from('rental_applications')
      .select('*')
      .eq('property_id', propertyId)
      .order('submitted_at', { ascending: false });
    setApps(data ?? []);
    setLoading(false);
  };

  const updateStatus = async (appId: string, status: ApplicationStatus, notes?: string) => {
    await (supabase as any)
      .from('rental_applications')
      .update({ status, ...(notes ? { pm_notes: notes } : {}) })
      .eq('id', appId);
    fetchApps();
  };

  return { apps, loading, updateStatus };
}
