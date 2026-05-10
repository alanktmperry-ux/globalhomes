import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Loader2, Home as HomeIcon, Key, PiggyBank, Wallet, Shield, Zap, Scale } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Halo } from '@/types/halo';
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation } from '@/shared/lib/i18n';

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

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <Helmet><title>{t('seeker.dashboard.title')}</title></Helmet>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Greeting */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
            {isNewUser
              ? t('seeker.dashboard.welcome.firstTime', { name: displayName })
              : t('seeker.dashboard.welcome.returning', { name: displayName })}
          </h1>
          <p className="text-[#64748B] mt-1 text-sm sm:text-base">{t('seeker.dashboard.subtitle')}</p>
        </header>

        {halos === null ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Language preference banner */}
            {profile?.language_preference && profile.language_preference !== 'en' && (
              <div className="mb-6 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                <span className="text-lg" aria-hidden>{'🌐'}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('seeker.dashboard.langBanner.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('seeker.dashboard.langBanner.copy')}
                  </p>
                </div>
              </div>
            )}

            {/* Halo summary card */}
            <HaloSummaryCard intent={buyerIntent} />

            {/* Matched listings */}
            <MatchedListings matches={matches} />

            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 mt-8">
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
                <div className="mb-6 rounded-xl border border-[#FCD34D] bg-[#FEF3C7] p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <p className="text-sm text-[#92400E]">
                    {t('seeker.dashboard.expiry.body', {
                      suburb: suburbLabel,
                      intent: intentLabel,
                      days: daysLabel,
                    })}
                  </p>
                  <Button
                    size="sm"
                    className="bg-[#D97706] hover:bg-[#B45309] text-white shrink-0"
                    onClick={() => navigate(`/halo/new?edit=${expiringSoon.id}`)}
                  >
                    {t('seeker.dashboard.expiry.cta')}
                  </Button>
                </div>
              );
            })()}

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-[#E2E8F0]">
              <button className="px-4 py-2.5 text-sm font-semibold text-[#1A2E4A] border-b-2 border-[#1A2E4A] -mb-px">
                {t('seeker.dashboard.tabs.myHalos')}
              </button>
              <button
                onClick={() => navigate('/seeker/inbox')}
                className="px-4 py-2.5 text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors flex items-center gap-2"
              >
                {t('seeker.dashboard.tabs.inbox')}
                {unreadTotal > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#DC2626] text-white">
                    {unreadTotal}
                  </span>
                )}
              </button>
            </div>

            {/* Filter pills */}
            {(halos.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(['all', 'buy', 'rent'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[36px] ${
                      filter === f
                        ? 'bg-[#1A2E4A] text-white'
                        : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]'
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

            {/* Halo cards */}
            {halos.length === 0 ? (
              <EmptyState onCreate={() => navigate('/halo/new')} />
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
                {t(noMatchKey)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filtered.map((h) => <HaloCard key={h.id} halo={h} />)}
              </div>
            )}

            {/* Property journey */}
            <PropertyJourney hasRent={hasRent} hasBuy={hasBuy} />

            {/* Services */}
            {hasRent && <RenterServices />}
            {hasBuy && <BuyerServices />}
            {hasRent && <PlanningToBuy />}
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wider font-semibold text-[#64748B] mb-1">{label}</p>
      <p className={`font-bold text-[#1E293B] ${small ? 'text-base' : 'text-2xl sm:text-3xl'} ${highlight ? 'text-[#2563EB]' : ''}`}>
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
  const score = halo.quality_score ?? 0;
  const scoreColour = score >= 75 ? 'bg-[#D1FAE5] text-[#059669]' : score >= 50 ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B]';
  const scoreLabelKey = score >= 75 ? 'seeker.haloCard.score.strong' : score >= 50 ? 'seeker.haloCard.score.good' : 'seeker.haloCard.score.fair';
  const statusColour = halo.status === 'active' ? 'bg-[#D1FAE5] text-[#059669]' : halo.status === 'fulfilled' ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B]';
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

  const responsesLabel = halo.response_count > 0
    ? t(halo.response_count === 1 ? 'seeker.haloCard.responses.count.singular' : 'seeker.haloCard.responses.count.plural', { count: halo.response_count })
    : t('seeker.haloCard.responses.none');

  const safeDays = Math.max(0, days);
  const daysLeftLabel = t(safeDays === 1 ? 'seeker.haloCard.daysLeft.singular' : 'seeker.haloCard.daysLeft.plural', { count: safeDays });

  const statusKey = `seeker.haloCard.status.${halo.status}`;

  return (
    <article className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[#1E293B] text-base sm:text-lg leading-snug">
          {title}
        </h3>
        <Badge className={isBuy ? 'bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#DBEAFE]' : 'bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5]'}>
          {isBuy ? t('seeker.haloCard.badge.buy') : t('seeker.haloCard.badge.rent')}
        </Badge>
      </div>

      <p className="text-sm text-[#64748B] mb-3">
        {budgetLabel}{postedLabel}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary" className={statusColour + ' hover:' + statusColour}>
          {t(statusKey)}
        </Badge>
        {halo.quality_score != null && (
          <Badge variant="secondary" className={scoreColour + ' hover:' + scoreColour}>
            {t('seeker.haloCard.score', { score: halo.quality_score, label: t(scoreLabelKey) })}
          </Badge>
        )}
        <Badge variant="secondary" className={halo.response_count > 0 ? 'bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#DBEAFE]' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]'}>
          {responsesLabel}
        </Badge>
        <Badge variant="secondary" className={days < 7 ? 'bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2]' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]'}>
          {daysLeftLabel}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {halo.response_count > 0 ? (
          <>
            <Button onClick={() => navigate('/seeker/inbox')} className="bg-[#2563EB] hover:bg-[#1D4ED8]">{t('seeker.haloCard.cta.viewResponses')}</Button>
            <Button variant="ghost" onClick={() => navigate(`/halo/new?edit=${halo.id}`)}>{t('seeker.haloCard.cta.edit')}</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate(`/halo/new?edit=${halo.id}`)}>{t('seeker.haloCard.cta.edit')}</Button>
            <Button
              className="bg-[#1E3A5F] hover:bg-[#1A2E4A] text-white"
              onClick={() => toast.info(t('seeker.haloCard.toast.boost'))}
            >
              {t('seeker.haloCard.cta.boost')}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 sm:p-12 text-center">
      <div className="text-5xl mb-4" aria-hidden>{'🏡'}</div>
      <h2 className="text-xl font-bold text-[#1E293B] mb-2">{t('seeker.empty.title')}</h2>
      <p className="text-[#64748B] max-w-md mx-auto mb-6 text-sm sm:text-base">
        {t('seeker.empty.copy')}
      </p>
      <Button onClick={onCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
        {t('seeker.empty.cta')}
      </Button>
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
  const { t } = useTranslation();
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
        body={t('seeker.buyerServices.conveyancer.body')}
        onClick={() => navigate('/conveyancing')}
      />
    </section>
  );
}

function SmallServiceCard({ icon: Icon, title, body, onClick }: { icon: any; title: string; body: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 hover:border-[#2563EB] hover:shadow-md transition-all flex items-start gap-3"
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
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 mb-4">
        <h2 className="font-semibold text-sm text-foreground">{t('seeker.summary.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('seeker.summary.empty')}</p>
        <Button asChild size="sm">
          <Link to="/halo/new">{t('seeker.summary.cta')}</Link>
        </Button>
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

  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-foreground">{t('seeker.summary.title')}</h2>
        <Link to="/halo/new" className="text-xs text-primary hover:underline">{t('seeker.summary.edit')}</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip>{t('seeker.summary.chip.buy')}</Chip>
        {suburbs.length > 0 && <Chip>{suburbs.join(', ')}</Chip>}
        {priceLabel && <Chip>{priceLabel}</Chip>}
        {intent.bedrooms != null && <Chip>{t('seeker.summary.chip.beds', { count: intent.bedrooms })}</Chip>}
        {types.map((t2) => <Chip key={t2}>{t2}</Chip>)}
      </div>
    </div>
  );
}

function MatchedListings({ matches }: { matches: any[] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 mb-4">
      <h2 className="font-semibold text-sm text-foreground">
        {t('seeker.matches.title')}
        {matches.length > 0 && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{t('seeker.matches.found', { count: matches.length })}</span>
        )}
      </h2>
      {matches.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {t('seeker.matches.empty')}
          </p>
        </div>
      ) : (
        matches.map((match) => {
          const p = match.properties;
          const price = p.price_formatted ?? (p.price ? `$${Number(p.price).toLocaleString('en-AU')}` : '—');
          const specs = `${p.suburb}${p.beds != null ? t('seeker.matches.specs.bed', { count: p.beds }) : ''}${p.baths != null ? t('seeker.matches.specs.bath', { count: p.baths }) : ''}`;
          return (
            <Link
              key={match.id}
              to={`/properties/${p.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-accent transition-colors space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-1">{p.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {specs}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">{price}</p>
                  {match.match_score != null && (
                    <p className="text-xs text-primary font-medium">{t('seeker.matches.score', { score: match.match_score })}</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
