import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export function AgentCreditBadge({ className }: { className?: string }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', user.id)
        .maybeSingle();
      if (active) setBalance(data?.balance ?? 0);
    };
    load();

    const channel = supabase
      .channel(`halo-credits-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'halo_credits', filter: `agent_id=eq.${user.id}` },
        (payload) => {
          const newBal = (payload.new as any)?.balance;
          if (typeof newBal === 'number') setBalance(newBal);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (balance == null) return null;

  return (
    <Badge variant="secondary" className={className ?? 'bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1'}>
      <Coins size={12} />
      {balance} {balance === 1 ? 'credit' : 'credits'}
    </Badge>
  );
}

export default AgentCreditBadge;
