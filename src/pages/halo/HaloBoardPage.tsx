import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HaloPreviewCard } from '@/components/halo/HaloPreviewCard';
import { HaloUnlockDialog } from '@/components/halo/HaloUnlockDialog';
import { AgentCreditBadge } from '@/components/halo/AgentCreditBadge';
import {
  HaloBoardFilters,
  applyFilters,
  DEFAULT_FILTERS,
  type HaloBoardFiltersState,
} from '@/components/halo/HaloBoardFilters';
import type { Halo } from '@/types/halo';

type BoardTab = 'all' | 'pocket';

export default function HaloBoardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [halos, setHalos] = useState<Halo[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [pocketMatchIds, setPocketMatchIds] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<HaloBoardFiltersState>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<BoardTab>('all');
  const [target, setTarget] = useState<Halo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [halosRes, respRes, credRes] = await Promise.all([
          supabase
            .from('halos')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
          supabase.from('halo_responses').select('halo_id').eq('agent_id', user.id),
          supabase.from('halo_credits').select('balance').eq('agent_id', user.id).maybeSingle(),
        ]);
        if (!active) return;
        if (halosRes.error) throw halosRes.error;
        setHalos((halosRes.data ?? []) as Halo[]);
        setUnlockedIds(new Set((respRes.data ?? []).map((r: any) => r.halo_id)));
        setBalance(credRes.data?.balance ?? 0);
      } catch (e) {
        console.error('[HaloBoard] load error', e);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const filtered = applyFilters(halos, filters);

  const handleConfirm = async () => {
    if (!user || !target) return;
    setBusy(true);
    try {
      // Re-check balance
      const { data: cred } = await supabase
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', user.id)
        .maybeSingle();
      const current = cred?.balance ?? 0;
      if (current < 1) {
        toast.error("You don't have enough credits. Contact support to top up.");
        setTarget(null);
        return;
      }

      // Deduct credit
      const { error: updErr } = await supabase
        .from('halo_credits')
        .update({ balance: current - 1, updated_at: new Date().toISOString() })
        .eq('agent_id', user.id);
      if (updErr) throw updErr;

      // Log transaction
      const { error: txErr } = await supabase.from('halo_credit_transactions').insert({
        agent_id: user.id,
        amount: -1,
        type: 'spend',
        halo_id: target.id,
        note: 'Halo unlock',
      });
      if (txErr) throw txErr;

      // Insert response
      const { error: respErr } = await supabase.from('halo_responses').insert({
        halo_id: target.id,
        agent_id: user.id,
      });
      if (respErr && respErr.code !== '23505') throw respErr;

      // Notify seeker (best effort)
      supabase.functions
        .invoke('send-halo-agent-response', { body: { halo_id: target.id } })
        .catch((e) => console.warn('[HaloBoard] notify seeker failed', e));

      const id = target.id;
      setTarget(null);
      setBalance(current - 1);
      setUnlockedIds((prev) => new Set(prev).add(id));
      toast.success('Halo unlocked. Contact details are now visible.');
      navigate(`/dashboard/halo-board/${id}`);
    } catch (e) {
      console.error('[HaloBoard] unlock error', e);
      toast.error('Something went wrong. Your credit has not been spent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Halo Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse active seeker Halos. Spend 1 credit to unlock contact details.
          </p>
        </div>
        <AgentCreditBadge />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>Unable to load Halo Board. Please refresh.</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <>
          <HaloBoardFilters value={filters} onChange={setFilters} resultCount={filtered.length} />
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No active Halos match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((h) => (
                <HaloPreviewCard
                  key={h.id}
                  halo={h}
                  unlocked={unlockedIds.has(h.id)}
                  onRespond={setTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      <HaloUnlockDialog
        open={!!target}
        onOpenChange={(o) => !o && !busy && setTarget(null)}
        balance={balance}
        busy={busy}
        onConfirm={handleConfirm}
      />

      {busy && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      )}
    </div>
  );
}
