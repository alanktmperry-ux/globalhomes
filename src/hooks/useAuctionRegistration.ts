import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export function useAuctionRegistration(propertyId: string) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (name: string, email: string, phone: string) => {
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('auction_registrations')
      .upsert({
        property_id: propertyId,
        user_id: user?.id ?? null,
        name,
        email,
        phone: phone || null,
      } as any, { onConflict: 'property_id,email' });

    if (err) {
      setError('Could not register. Please try again.');
    } else {
      setRegistered(true);
    }
    setLoading(false);
  };

  return { register, loading, registered, error };
}
