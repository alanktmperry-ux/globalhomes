import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Home as HomeIcon, Key, PiggyBank, Wallet, Shield, Zap, Scale, Pencil, Plus, Search, MapPin, Inbox } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Halo } from '@/types/halo';
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation, formatCurrency } from '@/shared/lib/i18n';

type HaloRow = Halo & { response_count: number; unread_count: number };

const dayMs = 1000 * 60 * 60 * 24;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / dayMs);
const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

export default function SeekerDashboard() {
  usePageTitle('My Dashboard');
  const { user, loading, isAgent, isAdmin, isPartner, isSupport } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [halos, setHalos] = useState<HaloRow[] | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'buy' | 'rent'>('all');
  const [profile, setProfile] = useState<{ first_name: string | null; full_name: string | null; display_name: string | null; language_preference: string | null } | null>(null);
  const [buyerIntent, setBuyerIntent] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, full_name, display_name, language_preference')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setProfile(data as any);

      const { data: bi } = await supabase
        .from('buyer_intent')
        .select('*')
        .eq('buyer_id', user.id)
        .order('last_searched_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setBuyerIntent(bi);

      const { data: matchRows } = await supabase
        .from('listing_buyer_matches')
        .select('id, listing_id, match_score, match_reasoning, properties:listing_id(id, address, suburb, beds, baths, price, price_formatted)')
        .eq('buyer_id', user.id)
        .order('match_score', { ascending: false })
        .limit(10);
      if (!cancelled) setMatches((matchRows ?? []).filter((m: any) => m.properties));
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: haloRows, error } = await supabase
        .from('halos')
        .select('*')
        .eq('seeker_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('[SeekerDashboard] halos:', error);
        setHalos([]);
        return;
      }
      const ids = (haloRows ?? []).map((h: any) => h.id);
      if (ids.length === 0) {
        setHalos([]);
        setUnreadTotal(0);
        return;
      }
      const { data: respRows } = await supabase
        .from('halo_responses')
        .select('halo_id, viewed_by_seeker')
        .in('halo_id', ids);
      const counts = new Map<string, { total: number; unread: number }>();
      (respRows ?? []).forEach((r: any) => {
        const c = counts.get(r.halo_id) ?? { total: 0, unread: 0 };
        c.total += 1;
        if (!r.viewed_by_seeker) c.unread += 1;
        counts.set(r.halo_id, c);
      });
      let unread = 0;
      const enriched = (haloRows as any[]).map((h) => {
        const c = counts.get(h.id) ?? { total: 0, unread: 0 };
        unread += c.unread;
        return { ...h, response_count: c.total, unread_count: c.unread } as HaloRow;
      });
      setHalos(enriched);
      setUnreadTotal(unread);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Auth gating
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <Navigate to="/login?return_to=/seeker/dashboard" replace />;
  if (isAgent || isAdmin || isPartner || isSupport) return <Navigate to="/" replace />;

  const displayName = (user.user_metadata?.display_name as string)
    || profile?.display_name
    || (user.email ? user.email.split('@')[0] : null)
    || 'there';

  const activeHalos = halos?.filter((h) => h.status === 'active') ?? [];
  const isNewUser = halos?.length === 0;

  const stats = useMemo(() => {
    const langs = new Set<string>();
    halos?.forEach((h) => { if (h.preferred_language) langs.add(h.preferred_language); });
    return {
      active: activeHalos.length,
      unread: unreadTotal,
      languages: Array.from(langs)
        .map((l) => l.charAt(0).toUpperCase() + l.slice(1))
        .join(', ') || t('seeker.dashboard.stats.languagesDefault'),
    };
  }, [halos, activeHalos.length, unreadTotal, t]);

  const expiringSoon = activeHalos.find((h) => {
    const days = daysBetween(new Date(h.expires_at), new Date());
    return days >= 0 && days <= 7 && h.response_count === 0;
  });

  const filtered = (halos ?? []).filter((h) => filter === 'all' ? true : h.intent === filter);
  const hasRent = activeHalos.some((h) => h.intent === 'rent');
  const hasBuy = activeHalos.some((h) => h.intent === 'buy');

  const noMatchKey =
    filter === 'buy' ? 'seeker.dashboard.filter.noMatch.buy' :
    filter === 'rent' ? 'seeker.dashboard.filter.noMatch.rent' :
    'seeker.dashboard.filter.noMatch.all';

  const [tab, setTab] = useState<'halos' | 'inbox'>('halos');

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Helmet><title>{t('seeker.dashboard.title')}</title></Helmet>

      {/* Greeting */}
      <div className="max-w-[1280px] mx-auto pt-[120px] pb-12 px-6 sm:px-8">
        <h1 className="text-[clamp(36px,5vw,64px)] font-extrabold tracking-[-0.04em] text-black leading-[1.05]">
          {t(isNewUser ? 'seeker.dashboard.welcome.firstTime' : 'seeker.dashboard.welcome.returning', { name: displayName })}.
        </h1>
        <p className="text-[17px] text-[#4a4a4a] mt-3 font-normal">{t('seeker.dashboard.subtitle')}</p>
      </div>

      {halos === null ? (
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6a6a6a]" />
          </div>
        </div>
      ) : (
        <>
          {/* Your Halo card */}
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-2">
            <HaloSummaryCard intent={buyerIntent} />
          </div>

          {/* Matched listings */}
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-6">
            <MatchedListings matches={matches} />
          </div>

          {/* Stats */}
          <section className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatTile label={t('seeker.dashboard.stats.activeHalos')} value={String(stats.active)} />
            <StatTile label={t('seeker.dashboard.stats.unreadResponses')} value={String(stats.unread)} highlight={stats.unread > 0} />
            <StatTile label={t('seeker.dashboard.stats.languages')} value={stats.languages} small />
          </section>

          {/* Expiry banner */}
          {expiringSoon && (() => {
            const dayCount = Math.max(0, daysBetween(new Date(expiringSoon.expires_at), new Date()));
            const daysLabel = t(
              dayCount === 1 ? 'seeker.dashboard.expiry.days.singular' : 'seeker.dashboard.expiry.days.plural',
              { count: dayCount },
            );
            const intentLabel = t(
              expiringSoon.intent === 'buy' ? 'seeker.dashboard.expiry.intent.buy' : 'seeker.dashboard.expiry.intent.rent',
            );
            const suburbLabel = expiringSoon.suburbs?.[0] ?? t('seeker.haloCard.suburb.anywhere');
            return (
              <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-6">
                <div className="rounded-2xl border border-[#FCD34D] bg-[#FEF3C7] p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <p className="text-sm text-[#92400E]">
                    {t('seeker.dashboard.expiry.body', { suburb: suburbLabel, intent: intentLabel, days: daysLabel })}
                  </p>
                  <Button
                    size="sm"
                    className="bg-[#D97706] hover:bg-[#B45309] text-white shrink-0"
                    onClick={() => navigate(`/halo/new?edit=${expiringSoon.id}`)}
                  >
                    {t('seeker.dashboard.expiry.cta')}
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Tabs */}
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-10">
            <div className="flex items-center gap-1 bg-white rounded-2xl p-1 w-fit border border-[#E5E5E5]">
              <button
                onClick={() => setTab('halos')}
                className={`px-5 py-2.5 rounded-xl text-[13px] transition-colors ${
                  tab === 'halos'
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                    : 'text-[#6a6a6a] hover:text-[#374151] font-semibold'
                }`}
              >
                {t('seeker.dashboard.tabs.myHalos')}
              </button>
              <button
                onClick={() => { setTab('inbox'); navigate('/seeker/inbox'); }}
                className={`px-5 py-2.5 rounded-xl text-[13px] inline-flex items-center gap-2 transition-colors ${
                  tab === 'inbox'
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                    : 'text-[#6a6a6a] hover:text-[#374151] font-semibold'
                }`}
              >
                {t('seeker.dashboard.tabs.inbox')}
                {unreadTotal > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#DC2626] text-white">
                    {unreadTotal}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter pills */}
          {halos.length > 0 && (
            <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-5 flex flex-wrap gap-2">
              {(['all', 'buy', 'rent'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                    filter === f
                      ? 'bg-[#0a0f1e] text-white border border-[#0a0f1e]'
                      : 'bg-white text-[#374151] border border-[#E5E5E5] hover:border-[#2563EB] hover:text-[#2563EB]'
                  }`}
                >
                  {f === 'all'
                    ? t('seeker.dashboard.filter.all')
                    : f === 'buy'
                      ? t('seeker.dashboard.filter.buying')
                      : t('seeker.dashboard.filter.renting')}
                </button>
              ))}
            </div>
          )}

          {/* Halo cards or empty */}
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 mt-6">
            {halos.length === 0 ? (
              <EmptyState onCreate={() => navigate('/halo/new')} />
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center text-sm text-[#6a6a6a]">
                {t(noMatchKey)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((h) => <HaloCard key={h.id} halo={h} />)}
              </div>
            )}
          </div>

          {/* Property journey & services */}
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 pb-16">
            <PropertyJourney hasRent={hasRent} hasBuy={hasBuy} />
            {hasRent && <RenterServices />}
            {hasBuy && <BuyerServices />}
            {hasRent && <PlanningToBuy />}
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a6a6a]">{label}</p>
      <p className={`${small ? 'text-[22px]' : 'text-[48px]'} font-extrabold tabular-nums mt-3 leading-none ${highlight ? 'text-[#2563EB]' : 'text-black'}`}>
        {value}
      </p>
    </div>
  );
}

function HaloCard({ halo }: { halo: HaloRow }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const days = daysBetween(new Date(halo.expires_at), new Date());
  const suburb = halo.suburbs?.[0] ?? t('seeker.haloCard.suburb.anywhere');
  const propType = halo.property_types?.[0] ?? t('seeker.haloCard.type.default');
  const beds = halo.bedrooms_min ?? halo.bedrooms_max;
  const isBuy = halo.intent === 'buy';
  const ageDays = daysBetween(new Date(), new Date(halo.created_at));

  const title = beds
    ? t('seeker.haloCard.title.withBeds', { beds, type: propType, suburb })
    : t('seeker.haloCard.title.withoutBeds', { type: propType, suburb });

  const budgetLabel = halo.budget_min == null
    ? t('seeker.haloCard.budget.upTo', { max: fmtMoney(halo.budget_max) })
    : t('seeker.haloCard.budget.range', { min: fmtMoney(halo.budget_min), max: fmtMoney(halo.budget_max) });

  const postedLabel = ageDays === 0
    ? t('seeker.haloCard.posted.today')
    : t(ageDays === 1 ? 'seeker.haloCard.posted.daysAgo.singular' : 'seeker.haloCard.posted.daysAgo.plural', { count: ageDays });

  const safeDays = Math.max(0, days);
  const daysLeftLabel = t(safeDays === 1 ? 'seeker.haloCard.daysLeft.singular' : 'seeker.haloCard.daysLeft.plural', { count: safeDays });

  return (
    <article className="bg-white rounded-2xl border border-[#E5E5E5] p-6 hover:border-[#2563EB]/40 transition-colors flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-[#0a0f1e] text-[16px] leading-snug">{title}</h3>
        <span
          className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{
            background: isBuy ? '#EFF6FF' : '#ECFDF5',
            color: isBuy ? '#1E40AF' : '#065F46',
          }}
        >
          {isBuy ? t('seeker.haloCard.badge.buy') : t('seeker.haloCard.badge.rent')}
        </span>
      </div>

      <p className="text-[13px] text-[#6a6a6a]">{budgetLabel}{postedLabel}</p>

      <div className="flex flex-wrap gap-2">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#374151]">
          {halo.response_count > 0
            ? t(halo.response_count === 1 ? 'seeker.haloCard.responses.count.singular' : 'seeker.haloCard.responses.count.plural', { count: halo.response_count })
            : t('seeker.haloCard.responses.none')}
        </span>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${days < 7 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F3F4F6] text-[#374151]'}`}>
          {daysLeftLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        {halo.response_count > 0 ? (
          <>
            <button
              onClick={() => navigate('/seeker/inbox')}
              className="bg-[#0a0f1e] text-white rounded-full px-5 py-2.5 text-[13px] font-bold hover:bg-[#1a1f2e] transition-colors"
            >
              {t('seeker.haloCard.cta.viewResponses')}
            </button>
            <button
              onClick={() => navigate(`/halo/new?edit=${halo.id}`)}
              className="text-[#2563EB] hover:underline inline-flex items-center gap-1.5 text-[13px] font-bold px-2"
            >
              <Pencil size={13} /> {t('seeker.haloCard.cta.edit')}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate(`/halo/new?edit=${halo.id}`)}
            className="text-[#2563EB] hover:underline inline-flex items-center gap-1.5 text-[13px] font-bold"
          >
            <Pencil size={13} /> {t('seeker.haloCard.cta.edit')}
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-3xl p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
        <MapPin size={28} strokeWidth={1.5} />
      </div>
      <h2 className="text-[24px] font-bold text-[#0a0f1e] mt-6">{t('seeker.empty.title')}</h2>
      <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-[420px] mx-auto leading-[1.55]">
        {t('seeker.empty.copy')}
      </p>
      <button
        onClick={onCreate}
        className="mt-7 bg-black text-white border border-black rounded-full px-7 py-3.5 font-bold text-[14px] hover:bg-white hover:text-black transition-all inline-flex items-center gap-2.5"
      >
        <Plus size={16} /> {t('seeker.empty.cta')}
      </button>
    </div>
  );
}

function PropertyJourney({ hasRent, hasBuy }: { hasRent: boolean; hasBuy: boolean }) {
  const { t } = useTranslation();
  const Step = ({ icon: Icon, label, active }: { icon: any; label: string; active: boolean }) => (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
        <Icon size={20} />
      </div>
      <span className={`text-xs font-semibold ${active ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>{label}</span>
    </div>
  );
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">{t('seeker.journey.title')}</h2>
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Step icon={Key} label={t('seeker.journey.step.renting')} active={hasRent} />
          <div className="h-0.5 flex-1 bg-[#E2E8F0] -mt-6" />
          <Step icon={PiggyBank} label={t('seeker.journey.step.saving')} active={false} />
          <div className="h-0.5 flex-1 bg-[#E2E8F0] -mt-6" />
          <Step icon={HomeIcon} label={t('seeker.journey.step.buying')} active={hasBuy} />
        </div>
        <div className="mt-5 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] p-4 text-sm text-[#1E40AF]">
          {t('seeker.journey.tip')}
        </div>
      </div>
    </section>
  );
}

function RenterServices() {
  const { t } = useTranslation();
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">{t('seeker.renterServices.title')}</h2>
      <div className="rounded-xl bg-gradient-to-br from-[#1A2E4A] to-[#0E7490] text-white p-5 sm:p-6 mb-3">
        <div className="flex items-start gap-3">
          <Shield className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-base sm:text-lg">{t('seeker.renterServices.bond.title')}</h3>
            <p className="text-sm text-white/85 mt-1 mb-4">
              {t('seeker.renterServices.bond.copy')}
            </p>
            <Button className="bg-white text-[#1A2E4A] hover:bg-white/90">{t('seeker.renterServices.bond.cta')}</Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SmallServiceCard icon={Zap} title={t('seeker.renterServices.utilities.title')} body={t('seeker.renterServices.utilities.body')} />
        <SmallServiceCard icon={Shield} title={t('seeker.renterServices.insurance.title')} body={t('seeker.renterServices.insurance.body')} />
      </div>
    </section>
  );
}

function BuyerServices() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">{t('seeker.buyerServices.title')}</h2>
      <div className="rounded-xl bg-gradient-to-br from-[#1A2E4A] to-[#2563EB] text-white p-5 sm:p-6 mb-3">
        <div className="flex items-start gap-3">
          <Wallet className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-base sm:text-lg">{t('seeker.buyerServices.preapproval.title')}</h3>
            <p className="text-sm text-white/85 mt-1 mb-4">
              {t('seeker.buyerServices.preapproval.copy')}
            </p>
            <Button onClick={() => navigate('/brokers')} className="bg-white text-[#1A2E4A] hover:bg-white/90">
              {t('seeker.buyerServices.preapproval.cta')}
            </Button>
          </div>
        </div>
      </div>
      <SmallServiceCard
        icon={Scale}
        title={t('seeker.buyerServices.conveyancer.title')}
        body={t('seeker.buyerServices.conveyancer.body', { price: formatCurrency(990, language) })}
        onClick={() => navigate('/conveyancing')}
      />
    </section>
  );
}

function SmallServiceCard({ icon: Icon, title, body, onClick }: { icon: any; title: string; body: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-start bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 hover:border-[#2563EB] hover:shadow-md transition-all flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="font-semibold text-sm text-[#1E293B]">{title}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{body}</p>
      </div>
    </button>
  );
}

function PlanningToBuy() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section className="mt-8">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
        <h2 className="font-bold text-[#1E293B] text-base sm:text-lg mb-1">{t('seeker.planningToBuy.title')}</h2>
        <p className="text-sm text-[#64748B] mb-4">
          {t('seeker.planningToBuy.copy')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/brokers?lang=zh')} variant="outline" className="border-[#E2E8F0]">
            {t('seeker.planningToBuy.findMandarin')}
          </Button>
          <Button onClick={() => navigate('/brokers?lang=vi')} variant="outline" className="border-[#E2E8F0]">
            {t('seeker.planningToBuy.findVietnamese')}
          </Button>
        </div>
        <p className="text-xs text-[#94A3B8] mt-3">{t('seeker.planningToBuy.alsoAvailable')}</p>
      </div>
    </section>
  );
}

function fmtAud(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(n));
}

function HaloSummaryCard({ intent }: { intent: any | null }) {
  const { t } = useTranslation();
  if (!intent) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-7 flex items-center justify-between gap-6 flex-wrap hover:border-[#2563EB]/40 transition-colors">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a6a6a]">{t('seeker.summary.title')}</p>
          <h2 className="text-[20px] font-bold text-[#0a0f1e] mt-1.5">{t('seeker.summary.empty')}</h2>
        </div>
        <Link
          to="/halo/new"
          className="bg-black text-white rounded-full px-6 py-3 font-bold text-[13px] hover:bg-white hover:text-black border border-black transition-all inline-flex items-center gap-2"
        >
          <Plus size={14} /> {t('seeker.summary.cta')}
        </Link>
      </div>
    );
  }
  const suburbs = (intent.suburbs ?? []) as string[];
  const types = (intent.property_types ?? []) as string[];
  const minP = fmtAud(intent.min_price);
  const maxP = fmtAud(intent.max_price);
  const priceLabel = minP && maxP
    ? t('seeker.summary.price.range', { min: minP, max: maxP })
    : maxP
      ? t('seeker.summary.price.upTo', { max: maxP })
      : minP
        ? t('seeker.summary.price.from', { min: minP })
        : null;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-3xl p-7 flex items-center justify-between gap-6 flex-wrap hover:border-[#2563EB]/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6a6a6a]">{t('seeker.summary.title')}</p>
        <h2 className="text-[20px] font-bold text-[#0a0f1e] mt-1.5">
          {suburbs.length > 0 ? suburbs.join(', ') : t('seeker.haloCard.suburb.anywhere')}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#EFF6FF] text-[#1E40AF]">
            {t('seeker.summary.chip.buy')}
          </span>
          {types.map((ty) => (
            <span key={ty} className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#F3F4F6] text-[#374151]">
              {ty}
            </span>
          ))}
          {priceLabel && (
            <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#F3F4F6] text-[#374151]">{priceLabel}</span>
          )}
          {intent.bedrooms != null && (
            <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#F3F4F6] text-[#374151]">
              {t('seeker.summary.chip.beds', { count: intent.bedrooms })}
            </span>
          )}
        </div>
      </div>
      <Link
        to="/halo/new"
        className="text-[13px] font-bold text-[#2563EB] hover:underline inline-flex items-center gap-1.5"
      >
        <Pencil size={14} /> {t('seeker.summary.edit')}
      </Link>
    </div>
  );
}

function MatchedListings({ matches }: { matches: any[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[18px] font-bold text-[#0a0f1e]">{t('seeker.matches.title')}</h2>
        {matches.length > 0 && (
          <span className="text-[12px] font-semibold text-[#6a6a6a]">
            {t('seeker.matches.found', { count: matches.length })}
          </span>
        )}
      </div>
      {matches.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto">
            <Search size={20} strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-bold text-[#0a0f1e] mt-4">{t('seeker.matches.empty')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {matches.map((match) => {
            const p = match.properties;
            const price = p.price_formatted ?? (p.price ? `$${Number(p.price).toLocaleString('en-AU')}` : '—');
            return (
              <Link
                key={match.id}
                to={`/properties/${p.id}`}
                className="block bg-white rounded-2xl border border-[#E5E5E5] p-5 hover:border-[#2563EB] transition-colors"
              >
                <p className="font-bold text-[15px] text-[#0a0f1e] line-clamp-1">{p.address}</p>
                <p className="text-[12px] text-[#6a6a6a] mt-1">{p.suburb}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[16px] font-extrabold text-black tabular-nums">{price}</p>
                  {match.match_score != null && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                      {t('seeker.matches.score', { score: match.match_score })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
