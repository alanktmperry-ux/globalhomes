import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BuyerBadge {
  pre_approval_verified: boolean;
  pre_approval_amount: number | null;
  pre_approval_expiry: string | null;
  pre_approval_lender: string | null;
}

export function useBuyerPreApprovalBadge(userId: string | undefined) {
  const [badge, setBadge] = useState<BuyerBadge | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('pre_approval_verified, pre_approval_amount, pre_approval_expiry, pre_approval_lender')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => setBadge((data as unknown as BuyerBadge) ?? null));
  }, [userId]);

  return badge;
}
