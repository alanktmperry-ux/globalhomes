import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, X, Sparkles, Plus, Lightbulb } from 'lucide-react';
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
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation } from '@/shared/lib/i18n';

type BoardTab = 'all' | 'pocket';

export default function HaloBoardPage() {
  const { t } = useTranslation();
  usePageTitle(t('halo.board.pageTitle'));
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
        toast.error(t('halo.board.toast.agentNotFound'));
        setTarget(null);
        return;
      }

      // Atomic spend via RPC (prevents double-spend race conditions)
      const { error: rpcErr } = await (supabase.rpc as any)('spend_halo_credit', {
        p_agent_id: agent.id,
        p_halo_id: target.id,
      });
      if (rpcErr) {
        toast.error(t('halo.board.toast.insufficient'));
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
      toast.success(t('halo.board.toast.unlocked'));
      navigate(`/dashboard/halo-board/${id}`);
    } catch (e) {
      console.error('[HaloBoard] unlock error', e);
      toast.error(t('halo.board.toast.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight">{t('halo.board.title')}</h1>
          <p className="text-sm font-light text-[#6B7280] mt-1 mb-0">
            {t('halo.board.subtitle')}
          </p>
        </div>
        <div
          className="flex items-center gap-3 bg-white rounded-[12px] px-4 py-2.5"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <div className="flex flex-col">
            <span
              className="text-[10px] uppercase font-semibold text-[#6B7280]"
              style={{ letterSpacing: '0.10em' }}
            >
              Halo Credits
            </span>
            <span className="text-xl font-bold text-[#0a0f1e] tabular-nums leading-tight">
              {balance}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/buy-credits')}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-[10px] px-3 py-1.5 text-xs flex items-center gap-1 transition-all"
          >
            <Plus size={14} /> Top up
          </button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t('halo.board.error')}</AlertDescription>
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
                  {t(balance === 1 ? 'halo.board.lowCredit.one' : 'halo.board.lowCredit.other', { count: balance })}
                </p>
                <p className="text-xs opacity-90">
                  {t('halo.board.lowCredit.topUp')}
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
                {t('halo.board.lowCredit.buy')}
              </Button>
              {!persistentBanner && (
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  aria-label={t('halo.board.lowCredit.dismiss')}
                  className="text-current opacity-60 hover:opacity-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(v as BoardTab)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">{t('halo.board.tabs.all')}</TabsTrigger>
              <TabsTrigger value="pocket">
                {t('halo.board.tabs.pocket')}
                {pocketMatchIds.size > 0 && (
                  <span className="ms-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-amber-500 text-white px-1">
                    {pocketMatchIds.size}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <HaloBoardFilters value={filters} onChange={setFilters} resultCount={filtered.length} />
          {filtered.length === 0 ? (
            cleanHalos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles size={28} className="text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">{t('halo.board.empty.title')}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t('halo.board.empty.body')}
                  </p>
                </div>
                <Button onClick={() => navigate('/dashboard/listings/new')}>
                  {t('halo.board.empty.cta')}
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                {tab === 'pocket'
                  ? t('halo.board.empty.filtered.pocket')
                  : t('halo.board.empty.filtered.all')}
              </p>
            )
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
