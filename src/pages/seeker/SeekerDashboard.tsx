import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Loader2, Home as HomeIcon, Key, PiggyBank, Wallet, Shield, Zap, Scale, Building2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Halo } from '@/types/halo';

type HaloRow = Halo & { response_count: number; unread_count: number };

const dayMs = 1000 * 60 * 60 * 24;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / dayMs);
const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

export default function SeekerDashboard() {
  const { user, loading, isAgent, isAdmin, isPartner, isSupport } = useAuth();
  const navigate = useNavigate();
  const [halos, setHalos] = useState<HaloRow[] | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'buy' | 'rent'>('all');

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

  const firstName = (user.user_metadata?.first_name as string)
    ?? (user.user_metadata?.full_name as string)?.split(' ')[0]
    ?? user.email?.split('@')[0]
    ?? 'there';

  const activeHalos = halos?.filter((h) => h.status === 'active') ?? [];
  const isNewUser = halos?.length === 0;

  const stats = useMemo(() => {
    const langs = new Set<string>();
    halos?.forEach((h) => { if (h.preferred_language) langs.add(h.preferred_language); });
    return {
      active: activeHalos.length,
      unread: unreadTotal,
      languages: Array.from(langs).join(', ') || 'English',
    };
  }, [halos, activeHalos.length, unreadTotal]);

  const expiringSoon = activeHalos.find((h) => {
    const days = daysBetween(new Date(h.expires_at), new Date());
    return days >= 0 && days <= 7 && h.response_count === 0;
  });

  const filtered = (halos ?? []).filter((h) => filter === 'all' ? true : h.intent === filter);
  const hasRent = activeHalos.some((h) => h.intent === 'rent');
  const hasBuy = activeHalos.some((h) => h.intent === 'buy');

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <Helmet><title>My Halos · ListHQ</title></Helmet>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Greeting */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
            {isNewUser ? `Welcome, ${firstName} 👋` : `Welcome back, ${firstName} 👋`}
          </h1>
          <p className="text-[#64748B] mt-1 text-sm sm:text-base">Here's everything happening with your property search.</p>
        </header>

        {halos === null ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <StatTile label="Active Halos" value={String(stats.active)} />
              <StatTile label="Unread Responses" value={String(stats.unread)} highlight={stats.unread > 0} />
              <StatTile label="Languages" value={stats.languages} small />
            </section>

            {/* Expiry banner */}
            {expiringSoon && (
              <div className="mb-6 rounded-xl border border-[#FCD34D] bg-[#FEF3C7] p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <p className="text-sm text-[#92400E]">
                  Your <strong>{expiringSoon.suburbs?.[0] ?? 'Halo'}</strong>{' '}
                  {expiringSoon.intent === 'buy' ? 'Buy' : 'Rent'} Halo expires in{' '}
                  <strong>{Math.max(0, daysBetween(new Date(expiringSoon.expires_at), new Date()))} days</strong>{' '}
                  with no responses yet. Consider updating your requirements.
                </p>
                <Button
                  size="sm"
                  className="bg-[#D97706] hover:bg-[#B45309] text-white shrink-0"
                  onClick={() => navigate(`/halo/new?edit=${expiringSoon.id}`)}
                >
                  Update Halo
                </Button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-[#E2E8F0]">
              <button className="px-4 py-2.5 text-sm font-semibold text-[#1A2E4A] border-b-2 border-[#1A2E4A] -mb-px">
                My Halos
              </button>
              <button
                onClick={() => navigate('/seeker/inbox')}
                className="px-4 py-2.5 text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors flex items-center gap-2"
              >
                Inbox
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
                    {f === 'all' ? 'All' : f === 'buy' ? '🏡 Buying' : '🔑 Renting'}
                  </button>
                ))}
              </div>
            )}

            {/* Halo cards */}
            {halos.length === 0 ? (
              <EmptyState onCreate={() => navigate('/halo/new')} />
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
                No {filter} Halos. Switch filter or post a new one.
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
  const days = daysBetween(new Date(halo.expires_at), new Date());
  const suburb = halo.suburbs?.[0] ?? 'Anywhere';
  const propType = halo.property_types?.[0] ?? 'Property';
  const beds = halo.bedrooms_min ?? halo.bedrooms_max;
  const isBuy = halo.intent === 'buy';
  const score = halo.quality_score ?? 0;
  const scoreColour = score >= 75 ? 'bg-[#D1FAE5] text-[#059669]' : score >= 50 ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B]';
  const scoreLabel = score >= 75 ? 'Strong' : score >= 50 ? 'Good' : 'Fair';
  const statusColour = halo.status === 'active' ? 'bg-[#D1FAE5] text-[#059669]' : halo.status === 'fulfilled' ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B]';
  const ageDays = daysBetween(new Date(), new Date(halo.created_at));

  return (
    <article className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[#1E293B] text-base sm:text-lg leading-snug">
          {beds ? `${beds} Bedroom ` : ''}{propType} · {suburb}
        </h3>
        <Badge className={isBuy ? 'bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#DBEAFE]' : 'bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5]'}>
          {isBuy ? '🏡 BUY' : '🔑 RENT'}
        </Badge>
      </div>

      <p className="text-sm text-[#64748B] mb-3">
        Budget {fmtMoney(halo.budget_min)} – {fmtMoney(halo.budget_max)}
        {' · Posted '}{ageDays === 0 ? 'today' : `${ageDays} day${ageDays === 1 ? '' : 's'} ago`}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary" className={statusColour + ' hover:' + statusColour}>
          {halo.status[0].toUpperCase() + halo.status.slice(1)}
        </Badge>
        {halo.quality_score != null && (
          <Badge variant="secondary" className={scoreColour + ' hover:' + scoreColour}>
            ⭐ Score {halo.quality_score} · {scoreLabel}
          </Badge>
        )}
        <Badge variant="secondary" className={halo.response_count > 0 ? 'bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#DBEAFE]' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]'}>
          💬 {halo.response_count > 0 ? `${halo.response_count} responses` : 'No responses yet'}
        </Badge>
        <Badge variant="secondary" className={days < 7 ? 'bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2]' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]'}>
          📅 {Math.max(0, days)} days left
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {halo.response_count > 0 ? (
          <>
            <Button onClick={() => navigate('/seeker/inbox')} className="bg-[#2563EB] hover:bg-[#1D4ED8]">View Responses</Button>
            <Button variant="ghost" onClick={() => navigate(`/halo/new?edit=${halo.id}`)}>Edit</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate(`/halo/new?edit=${halo.id}`)}>Edit</Button>
            <Button
              className="bg-[#1E3A5F] hover:bg-[#1A2E4A] text-white"
              onClick={() => toast.info('Boost visibility — coming soon')}
            >
              Boost visibility
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 sm:p-12 text-center">
      <div className="text-5xl mb-4">🏡</div>
      <h2 className="text-xl font-bold text-[#1E293B] mb-2">You haven't posted a Halo yet</h2>
      <p className="text-[#64748B] max-w-md mx-auto mb-6 text-sm sm:text-base">
        Tell agents exactly what you're looking for — suburb, budget, timeline, in your language. Agents come to you.
      </p>
      <Button onClick={onCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
        Post your first Halo →
      </Button>
    </div>
  );
}

function PropertyJourney({ hasRent, hasBuy }: { hasRent: boolean; hasBuy: boolean }) {
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
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Your property journey</h2>
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Step icon={Key} label="Renting" active={hasRent} />
          <div className="h-0.5 flex-1 bg-[#E2E8F0] -mt-6" />
          <Step icon={PiggyBank} label="Saving" active={false} />
          <div className="h-0.5 flex-1 bg-[#E2E8F0] -mt-6" />
          <Step icon={HomeIcon} label="Buying" active={hasBuy} />
        </div>
        <div className="mt-5 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] p-4 text-sm text-[#1E40AF]">
          💡 Many renters on ListHQ go on to buy their first home through us. When you're ready, your preferences and suburb history are already saved — your Buy Halo will take 2 minutes.
        </div>
      </div>
    </section>
  );
}

function RenterServices() {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Services for renters</h2>
      <div className="rounded-xl bg-gradient-to-br from-[#1A2E4A] to-[#0E7490] text-white p-5 sm:p-6 mb-3">
        <div className="flex items-start gap-3">
          <Shield className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-base sm:text-lg">🔐 Rental bond guarantee</h3>
            <p className="text-sm text-white/85 mt-1 mb-4">
              No 4-weeks bond upfront needed. Pay a small weekly fee instead. Available in English, 中文, Tiếng Việt.
            </p>
            <Button className="bg-white text-[#1A2E4A] hover:bg-white/90">Get bond guarantee → From $8/week</Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SmallServiceCard icon={Zap} title="Connect utilities" body="Electricity, gas, internet in one step" />
        <SmallServiceCard icon={Shield} title="Contents insurance" body="From $8/month" />
      </div>
    </section>
  );
}

function BuyerServices() {
  const navigate = useNavigate();
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Services for buyers</h2>
      <div className="rounded-xl bg-gradient-to-br from-[#1A2E4A] to-[#2563EB] text-white p-5 sm:p-6 mb-3">
        <div className="flex items-start gap-3">
          <Wallet className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-base sm:text-lg">🏦 Get pre-approved before you inspect</h3>
            <p className="text-sm text-white/85 mt-1 mb-4">
              Know your real budget. We'll connect you with a multilingual mortgage broker — English, 中文, Tiếng Việt available.
            </p>
            <Button onClick={() => navigate('/brokers')} className="bg-white text-[#1A2E4A] hover:bg-white/90">
              Find a broker → Free, no obligation
            </Button>
          </div>
        </div>
      </div>
      <SmallServiceCard
        icon={Scale}
        title="Need a conveyancer?"
        body="Fixed-fee settlement from $990. Multilingual available in NSW, VIC, QLD."
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
  return (
    <section className="mt-8">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
        <h2 className="font-bold text-[#1E293B] text-base sm:text-lg mb-1">Planning to buy one day? Start now.</h2>
        <p className="text-sm text-[#64748B] mb-4">
          Talk to a multilingual mortgage broker — they'll tell you exactly how much deposit you need and when you'll be ready. No commitment, no cost.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/brokers?lang=zh')} variant="outline" className="border-[#E2E8F0]">
            🏦 Find a Mandarin-speaking broker
          </Button>
          <Button onClick={() => navigate('/brokers?lang=vi')} variant="outline" className="border-[#E2E8F0]">
            🏦 Find a Vietnamese-speaking broker
          </Button>
        </div>
        <p className="text-xs text-[#94A3B8] mt-3">Also available in Korean, Arabic, Hindi — free, no obligation.</p>
      </div>
    </section>
  );
}
