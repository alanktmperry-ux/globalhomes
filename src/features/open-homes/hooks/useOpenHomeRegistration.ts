import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { ingestOpenHomeLead } from '@/features/open-homes/lib/ingestOpenHomeLead';

export function useOpenHomeRegistration(openHomeId: string, isFull: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (name: string, email: string, phone: string) => {
    setLoading(true);
    setError(null);

    const normalizedEmail = email.toLowerCase().trim();
    const { error: err } = await supabase
      .from('open_home_registrations')
      .upsert({
        open_home_id: openHomeId,
        user_id: user?.id ?? null,
        name,
        email: normalizedEmail,
        phone: phone || null,
        on_waitlist: isFull,
      } as any, { onConflict: 'open_home_id,email' });

    if (err) {
      setError('Could not register. Please try again.');
    } else {
      setRegistered(true);
      setOnWaitlist(isFull);
      // Fire-and-forget: CRM ingest + confirmation email (skip for waitlist)
      if (!isFull) {
        try {
          const { data: oh } = await supabase
            .from('open_homes')
            .select('property_id, starts_at')
            .eq('id', openHomeId)
            .maybeSingle();
          if (oh?.property_id) {
            void ingestOpenHomeLead({
              propertyId: oh.property_id,
              name,
              email: normalizedEmail,
              phone,
              openHomeStartsAt: oh.starts_at,
            });
          }
        } catch { /* non-blocking */ }
      }
    }
    setLoading(false);
  };

  return { register, loading, registered, onWaitlist, error };
}
