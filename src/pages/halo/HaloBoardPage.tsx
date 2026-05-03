import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useHaloCreditsBalance } from '@/features/halo/hooks/useHaloCreditsBalance';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  const queryClient = useQueryClient();
  const { balance } = useHaloCreditsBalance();
  const [halos, setHalos] = useState<Halo[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [pocketMatchIds, setPocketMatchIds] = useState<Set<string>>(new Set());
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
        // Halos list may already be in cache from sidebar hover prefetch.
        const cachedHalos = queryClient.getQueryData<Halo[]>(['halo-board-halos']);
        const halosPromise = cachedHalos
          ? Promise.resolve({ data: cachedHalos, error: null as any })
          : supabase
              .from('halos')
              .select('*')
              .eq('status', 'active')
              .order('created_at', { ascending: false });

        const [halosRes, respRes, pmRes] = await Promise.all([
          halosPromise,
          supabase.from('halo_responses').select('halo_id').eq('agent_id', user.id),
          supabase.from('halo_pocket_matches').select('halo_id').eq('agent_id', user.id),
        ]);
        if (!active) return;
        if ((halosRes as any).error) throw (halosRes as any).error;
        const halosData = (halosRes as any).data ?? [];
        setHalos(halosData as Halo[]);
        queryClient.setQueryData(['halo-board-halos'], halosData);
        setUnlockedIds(new Set((respRes.data ?? []).map((r: any) => r.halo_id)));
        setPocketMatchIds(new Set((pmRes.data ?? []).map((r: any) => r.halo_id)));
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
  }, [user, queryClient]);

  // Realtime: new/updated/deleted Halos appear without a refresh.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('halo-board-halos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'halos' },
        (payload) => {
          const row = payload.new as Halo;
          if (row.status !== 'active') return;
          setHalos((prev) => {
            if (prev.some((h) => h.id === row.id)) return prev;
            const next = [row, ...prev];
            queryClient.setQueryData(['halo-board-halos'], next);
            return next;
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'halos' },
        (payload) => {
          const row = payload.new as Halo;
          setHalos((prev) => {
            const exists = prev.some((h) => h.id === row.id);
            let next: Halo[];
            if (row.status !== 'active') {
              next = prev.filter((h) => h.id !== row.id);
            } else if (exists) {
              next = prev.map((h) => (h.id === row.id ? row : h));
            } else {
              next = [row, ...prev];
            }
            queryClient.setQueryData(['halo-board-halos'], next);
            return next;
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'halos' },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) return;
          setHalos((prev) => {
            const next = prev.filter((h) => h.id !== oldId);
            queryClient.setQueryData(['halo-board-halos'], next);
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Heuristic junk filter — hide obviously test/spam Halos.
  // Residential 'buy' Halos with budget over $10M are almost always test data.
  const isJunk = (h: Halo) => {
    if (h.intent === 'buy' && (h.budget_max ?? 0) > 10_000_000) {
      const types = (h.property_types || []).map((t) => t.toLowerCase());
      const isCommercial = types.includes('commercial') || types.includes('land');
      if (!isCommercial) return true;
    }
    return false;
  };
  const cleanHalos = useMemo(() => halos.filter((h) => !isJunk(h)), [halos]);

  const tabFiltered = tab === 'pocket' ? cleanHalos.filter((h) => pocketMatchIds.has(h.id)) : cleanHalos;
  const filtered = applyFilters(tabFiltered, filters);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showLowCreditBanner = balance <= 2 && !(balance > 0 && bannerDismissed);
  const persistentBanner = balance === 0;

  const handleConfirm = async () => {
    if (!user || !target) return;
    setBusy(true);
    try {
      // Resolve agents.id (halo_credits.agent_id references agents.id, not auth user id)
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent) {
        toast.error('Agent record not found.');
        setTarget(null);
        return;
      }

      // Atomic spend via RPC (prevents double-spend race conditions)
      const { error: rpcErr } = await supabase.rpc('spend_halo_credit', {
        p_agent_id: agent.id,
        p_halo_id: target.id,
      });
      if (rpcErr) {
        toast.error('Insufficient credits or already unlocked.');
        setTarget(null);
        return;
      }

      // Log transaction (best-effort)
      await supabase.from('halo_credit_transactions').insert({
        agent_id: agent.id,
        amount: -1,
        type: 'spend',
        halo_id: target.id,
        note: 'Halo unlock',
      });

      // Insert response
      const { error: respErr } = await supabase.from('halo_responses').insert({
        halo_id: target.id,
        agent_id: agent.id,
      });
      if (respErr && respErr.code !== '23505') throw respErr;

      // Notify seeker (best effort)
      supabase.functions
        .invoke('send-halo-agent-response', { body: { halo_id: target.id } })
        .catch((e) => console.warn('[HaloBoard] notify seeker failed', e));

      const id = target.id;
      setTarget(null);
      queryClient.invalidateQueries({ queryKey: ['halo-credits-balance', user.id] });
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
          {showLowCreditBanner && (
            <div
              className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 ${
                persistentBanner
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  You have {balance} credit{balance === 1 ? '' : 's'} left.
                </p>
                <p className="text-xs opacity-90">
                  Top up to keep responding to seekers.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/buy-credits')}
                className={
                  persistentBanner
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }
              >
                Buy Credits →
              </Button>
              {!persistentBanner && (
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Dismiss banner"
                  className="text-current opacity-60 hover:opacity-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(v as BoardTab)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Halos</TabsTrigger>
              <TabsTrigger value="pocket">
                Private Matches
                {pocketMatchIds.size > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-amber-500 text-white px-1">
                    {pocketMatchIds.size}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <HaloBoardFilters value={filters} onChange={setFilters} resultCount={filtered.length} />
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {tab === 'pocket'
                ? 'No Halos match any of your pocket listings yet.'
                : 'No active Halos match your filters.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((h) => (
                <HaloPreviewCard
                  key={h.id}
                  halo={h}
                  unlocked={unlockedIds.has(h.id)}
                  onRespond={setTarget}
                  pocketMatch={pocketMatchIds.has(h.id)}
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
