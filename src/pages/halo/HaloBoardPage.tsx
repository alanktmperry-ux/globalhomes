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
import { HaloPreviewCard } from '@/components/halo/HaloPreviewCard';
import { HaloUnlockDialog } from '@/components/halo/HaloUnlockDialog';
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

        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        const agentId = agentData?.id ?? null;

        const [halosRes, respRes, pmRes] = await Promise.all([
          halosPromise,
          agentId
            ? supabase.from('halo_responses').select('halo_id').eq('agent_id', agentId)
            : Promise.resolve({ data: [] as any[] }),
          agentId
            ? supabase.from('halo_pocket_matches').select('halo_id').eq('agent_id', agentId)
            : Promise.resolve({ data: [] as any[] }),
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

  const Ico = ({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) =>
    // @ts-expect-error iconify web component
    <iconify-icon icon={icon} width={size} height={size} style={{ color, display: 'inline-block' }} />;

  const activeCount = cleanHalos.length;
  const hasFilters =
    filters.intent !== 'all' ||
    filters.language !== 'all' ||
    filters.propertyTypes.length > 0 ||
    filters.suburb.trim() !== '' ||
    filters.budget !== 'any';

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="font-extrabold tracking-[-0.04em] text-[#0a0f1e]"
              style={{ fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1.05 }}
            >
              {t('agent.halo.pageTitle')}
            </h1>
            {!loading && (
              <span className="bg-[#EFF6FF] border border-[#2563EB]/15 text-[#1E40AF] rounded-full px-3 py-1 text-[12px] font-bold">
                {t(activeCount === 1 ? 'agent.halo.activeBriefs.one' : 'agent.halo.activeBriefs.other', { count: activeCount })}
              </span>
            )}
            {tab === 'pocket' && pocketMatchIds.size > 0 && (
              <span className="bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#92400E] rounded-full px-3 py-1 text-[12px] font-bold">
                {t('agent.halo.pocketCount', { count: pocketMatchIds.size })}
              </span>
            )}
          </div>
          <p className="text-[14px] text-[#6a6a6a] font-medium mt-2">
            {t('agent.halo.pageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white border border-[#E5E5E5] rounded-full px-4 py-2 inline-flex items-center gap-2.5">
            <Ico icon="solar:bolt-bold" size={18} color="#2563EB" />
            <span className="text-[16px] font-extrabold text-[#0a0f1e] tabular-nums">{balance}</span>
            <span className="text-[12px] text-[#6a6a6a] font-medium">{t('agent.halo.credits.label')}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/buy-credits')}
            className="text-white rounded-full px-5 py-2.5 text-[13px] font-extrabold inline-flex items-center gap-2 transition hover:opacity-95"
            style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}
          >
            <Ico icon="solar:add-square-bold" size={16} />
            <span>{t('agent.halo.credits.buy')}</span>
          </button>
        </div>
      </div>

      {/* Tab toggle (All / Pocket) */}
      <div className="inline-flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-full p-1 mb-5">
        {(['all', 'pocket'] as BoardTab[]).map((tk) => {
          const active = tab === tk;
          return (
            <button
              key={tk}
              type="button"
              onClick={() => setTab(tk)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition ${
                active ? 'bg-white text-[#0a0f1e] shadow-sm' : 'text-[#6a6a6a] hover:text-[#0a0f1e]'
              }`}
            >
              {tk === 'all' ? t('halo.board.tabs.all') : t('halo.board.tabs.pocket')}
              {tk === 'pocket' && pocketMatchIds.size > 0 && (
                <span className="ms-1.5 bg-[#FEF3C7] text-[#92400E] rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {pocketMatchIds.size}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Low credit banner */}
      {!loading && showLowCreditBanner && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            persistentBanner
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {t(balance === 1 ? 'halo.board.lowCredit.one' : 'halo.board.lowCredit.other', { count: balance })}
            </p>
            <p className="text-xs opacity-90 mt-0.5">{t('halo.board.lowCredit.topUp')}</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/dashboard/buy-credits')}
            className={
              persistentBanner
                ? 'bg-red-600 hover:bg-red-700 text-white rounded-full'
                : 'bg-amber-600 hover:bg-amber-700 text-white rounded-full'
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

      {/* Body */}
      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{t('halo.board.error')}</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <HaloBoardFilters value={filters} onChange={setFilters} resultCount={filtered.length} />

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5E5E5] py-20 px-8 text-center">
              <div className="flex justify-center">
                <Ico icon="solar:streets-linear" size={56} color="#E5E7EB" />
              </div>
              <h3 className="text-[22px] font-bold text-[#0a0f1e] mt-6">{t('agent.halo.empty.title')}</h3>
              <p className="text-[14px] text-[#6a6a6a] max-w-[480px] mx-auto leading-[1.55] mt-3">
                {t('agent.halo.empty.body')}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-6 bg-white border border-[#E5E5E5] rounded-full px-5 py-2.5 text-[13px] font-bold text-[#0a0f1e] hover:bg-[#F9FAFB] transition"
                >
                  {t('agent.halo.empty.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

          {/* How Halo works callout — only when zero filters and zero briefs */}
          {!hasFilters && cleanHalos.length === 0 && (
            <div className="mt-8 bg-[#EFF6FF] border border-[#2563EB]/15 rounded-3xl p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0">
                <Ico icon="solar:lightbulb-bolt-bold" size={24} color="#2563EB" />
              </div>
              <div>
                <div className="text-[16px] font-extrabold text-[#1E40AF]">{t('agent.halo.how.title')}</div>
                <div className="text-[13px] text-[#1E40AF]/85 mt-1 leading-[1.55]">
                  {t('agent.halo.how.body')}
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      )}
    </div>
  );
}
