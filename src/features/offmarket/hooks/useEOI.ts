import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExpressionOfInterest, FinanceStatus } from '../types';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface SubmitEOIPayload {
  property_id: string;
  offered_price: number;
  finance_status: FinanceStatus;
  settlement_days?: number;
  conditions?: string;
  cover_letter?: string;
}

export function useEOI(propertyId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myEOI, setMyEOI] = useState<ExpressionOfInterest | null>(null);

  const loadMyEOI = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('expressions_of_interest')
      .select('*')
      .eq('property_id', propertyId)
      .eq('buyer_id', user.id)
      .maybeSingle();
    setMyEOI(data as ExpressionOfInterest | null);
  }, [propertyId]);

  useEffect(() => { loadMyEOI(); }, [loadMyEOI]);

  const submitEOI = async (payload: SubmitEOIPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to submit an EOI');
      const { data, error: err } = await supabase
        .from('expressions_of_interest')
        .upsert(
          { ...payload, buyer_id: user.id } as any,
          { onConflict: 'property_id,buyer_id' }
        )
        .select()
        .single();
      if (err) throw err;
      setMyEOI(data as ExpressionOfInterest);
      return data;
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const withdrawEOI = async (eoiId: string) => {
    setLoading(true);
    setError(null);
    try {
      await supabase
        .from('expressions_of_interest')
        .update({ status: 'withdrawn' } as any)
        .eq('id', eoiId);
      setMyEOI(prev => prev ? { ...prev, status: 'withdrawn' } : null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return { myEOI, loading, error, loadMyEOI, submitEOI, withdrawEOI };
}
