import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  differenceInDays, parseISO, subDays,
  format, eachDayOfInterval
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Eye, MessageCircle, Calendar,
  DollarSign, Mail, Flame, Clock,
  ChevronRight, Send, Loader2,
  Zap, Star, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: 0
});

const AU_DATE = (d: string) => format(parseISO(d), 'dd/MM/yyyy');

const URGENCY_LABEL: Record<string, { label: string; className: string }> = {
  ready_to_buy: {
    label: 'Hot',
    className: 'bg-red-500/15 text-red-500 border-0'
  },
  actively_looking: {
    label: 'Warm',
    className: 'bg-amber-500/15 text-amber-500 border-0'
  },
  just_browsing: {
    label: 'Cold',
    className: 'bg-blue-500/15 text-blue-400 border-0'
  },
};

interface Props {
  listing: any;
  onViewAllLeads?: () => void;
}

const ListingMarketingTab = ({ listing, onViewAllLeads }: Props) => {
  const { user } = useAuth();

  const [leads, setLeads] = useState<any[]>([]);
  const [weeklyViews, setWeeklyViews] = useState<
    { day: string; views: number; date: string }[]
  >([]);
  const [pastReports, setPastReports] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [boostLoading, setBoostLoading] = useState<string | null>(null);
  const [showPaymentStep, setShowPaymentStep] = useState<'featured' | 'premier' | null>(null);
  const [boostState, setBoostState] = useState<{
    is_featured: boolean;
    boost_tier: string | null;
    boost_requested_at: string | null;
    boost_requested_tier: string | null;
    featured_until: string | null;
  }>({
    is_featured: listing.is_featured || false,
    boost_tier: listing.boost_tier || null,
    boost_requested_at: listing.boost_requested_at || null,
    boost_requested_tier: listing.boost_requested_tier || null,
    featured_until: listing.featured_until || null,
  });
  

  const [vendorName, setVendorName] = useState(listing.vendor_name || '');
  const [vendorEmail, setVendorEmail] = useState(listing.vendor_email || '');
  const [sending, setSending] = useState(false);

  const isFeaturedActive = boostState.is_featured && boostState.featured_until && new Date(boostState.featured_until) > new Date();
  const isBoostPending = boostState.boost_requested_at && !boostState.is_featured;

  const BOOST_TIERS = {
    featured: {
      label: 'Featured',
      price: 49,
      priceLabel: '$49',
      duration: '30 days',
      billing: 'one-off · 30 days',
      color: 'amber',
      inclusions: [
        'Featured badge on your listing',
        'Homepage featured grid for 30 days',
        'Shown to buyers searching near ' + (listing.suburb || 'your suburb'),
        'Higher placement in search results',
        'Approx. 1.5× more enquiries',
        'Renew anytime for another 30 days',
      ],
    },
    premier: {
      label: 'Premier',
      price: 99,
      priceLabel: '$99',
      duration: '30 days',
      billing: 'one-off · 30 days',
      color: 'violet',
      badge: 'Most popular',
      inclusions: [
        'Everything in Featured',
        'Top of all search results in ' + (listing.suburb || 'your suburb'),
        'Hero image slot on homepage',
        'Email alert to buyers with matching saved searches',
        'Premier badge in search results',
        'Renew anytime for another 30 days',
      ],
    },
  } as const;

  const getActivationMessage = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const isAfterHours = hour < 8 || hour >= 18;
    if (isWeekend)
      return 'Our team activates boosts on business days. Yours will go live Monday morning AEST.';
    if (isAfterHours)
      return 'Our team activates boosts from 8am AEST. Yours will be live first thing next business day.';
    return 'Your boost will be activated within 1 business hour.';
  };




  useEffect(() => {
    const load = async () => {
      setLoadingStats(true);

      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, user_name, user_email, user_phone, urgency, status, created_at, message')
        .eq('property_id', listing.id)
        .order('created_at', { ascending: false });
      setLeads(leadsData || []);

      const since = subDays(new Date(), 27);
      const { data: eventsData } = await supabase
        .from('lead_events')
        .select('created_at')
        .eq('property_id', listing.id)
        .eq('event_type', 'view')
        .gte('created_at', since.toISOString());

      const days = eachDayOfInterval({ start: since, end: new Date() });
      const countsByDay: Record<string, number> = {};
      (eventsData || []).forEach((e: any) => {
        const key = format(parseISO(e.created_at), 'yyyy-MM-dd');
        countsByDay[key] = (countsByDay[key] || 0) + 1;
      });
      setWeeklyViews(
        days.map(d => ({
          day: format(d, 'dd MMM'),
          date: format(d, 'yyyy-MM-dd'),
          views: countsByDay[format(d, 'yyyy-MM-dd')] || 0,
        }))
      );

      const { data: reportsData } = await supabase
        .from('vendor_reports' as any)
        .select('*')
        .eq('property_id', listing.id)
        .order('sent_at', { ascending: false })
        .limit(5);
      setPastReports(reportsData || []);

      setLoadingStats(false);
    };
    load();
  }, [listing.id]);

  const daysOnMarket = listing.listed_date
    ? differenceInDays(new Date(), parseISO(listing.listed_date))
    : 0;
  const totalViews = listing.views || 0;
  const totalEnquiries = listing.contact_clicks || leads.length || 0;
  const hotLeads = leads.filter(l => l.urgency === 'ready_to_buy').length;
  const budget = listing.marketing_budget || 0;
  const domColor =
    daysOnMarket <= 21
      ? 'text-green-500'
      : daysOnMarket <= 42
      ? 'text-amber-500'
      : 'text-destructive';

  const handleRequestBoost = async (tier: 'featured' | 'premier') => {
    setBoostLoading(tier);
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('name, email, agency')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();

      const { error } = await supabase
        .from('properties')
        .update({
          boost_requested_at: new Date().toISOString(),
          boost_requested_tier: tier,
        } as any)
        .eq('id', listing.id);

      if (error) throw error;

      const tierData = BOOST_TIERS[tier];

      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: 'support@listhq.com.au',
          subject: `⚡ Boost request: ${listing.address} — ${tierData.label} — ${agent?.name || 'Agent'}`,
          html: `
            <h2>New boost request</h2>
            <p><strong>Tier:</strong> ${tierData.label} (${tierData.priceLabel} for 30 days)</p>
            <p><strong>Property:</strong> ${listing.address}, ${listing.suburb}</p>
            <p><strong>Listing ID:</strong> ${listing.id}</p>
            <p><strong>Agent:</strong> ${agent?.name || 'Unknown'} · ${agent?.agency || ''} · ${agent?.email || ''}</p>
            <p><strong>Requested:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
            <hr/>
            <p>Go to Admin → Listings to activate this boost.</p>
          `,
        },
      });

      toast.success(`${tierData.label} boost requested! — We'll activate within 1 business hour.`);
      setBoostState(prev => ({
        ...prev,
        boost_requested_at: new Date().toISOString(),
        boost_requested_tier: tier,
      }));
    } catch (e) {
      toast.error('Failed to submit boost request — please try again');
      console.error(e);
    } finally {
      setBoostLoading(null);
    }
  };

  const handleSendReport = async () => {
    if (!vendorName.trim() || !vendorEmail.trim()) {
      toast.error('Please enter both vendor name and email');
      return;
    }
    setSending(true);
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, agency, email')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();

      if (
        vendorName !== listing.vendor_name ||
        vendorEmail !== listing.vendor_email
      ) {
        await supabase
          .from('properties')
          .update({
            vendor_name: vendorName,
            vendor_email: vendorEmail,
          } as any)
          .eq('id', listing.id);
      }

      const reportHtml = buildVendorReportHtml({
        vendorName,
        agentName: agent?.name || 'Your Agent',
        agentAgency: agent?.agency || '',
        address: listing.address,
        suburb: listing.suburb,
        totalViews,
        totalEnquiries,
        hotLeads,
        daysOnMarket,
        budget,
        listingPrice: listing.price_formatted || '',
        weeklyViews,
      });

      const { error } = await supabase.functions.invoke(
        'send-notification-email',
        {
          body: {
            to: vendorEmail,
            subject: `Campaign update — ${listing.address}`,
            html: reportHtml,
          },
        }
      );

      if (error) throw error;

      if (agent) {
        await supabase.from('vendor_reports' as any).insert({
          property_id: listing.id,
          agent_id: agent.id,
          vendor_name: vendorName,
          vendor_email: vendorEmail,
          views_at_send: totalViews,
          enquiries_at_send: totalEnquiries,
          hot_leads_at_send: hotLeads,
          days_on_market_at_send: daysOnMarket,
        });
        const { data: updated } = await supabase
          .from('vendor_reports' as any)
          .select('*')
          .eq('property_id', listing.id)
          .order('sent_at', { ascending: false })
          .limit(5);
        setPastReports(updated || []);
      }

      toast.success(`Report sent to ${vendorEmail}`);
    } catch (e: any) {
      toast.error('Failed to send report — please try again');
      console.error(e);
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      {/* ── BOOST SECTION ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        {isFeaturedActive ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">● Active</Badge>
                <span className="text-sm font-bold">{BOOST_TIERS[boostState.boost_tier as keyof typeof BOOST_TIERS]?.label || 'Featured'} boost</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{BOOST_TIERS[boostState.boost_tier as keyof typeof BOOST_TIERS]?.priceLabel || '$49'}</span>
                <span className="text-xs text-muted-foreground"> for 30 days</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Your listing is live in the featured grid shown to buyers searching near{' '}
              <span className="font-medium text-foreground">{listing.suburb}</span>.
              {boostState.featured_until
                ? ` Active until ${format(parseISO(boostState.featured_until), 'dd MMM yyyy')}.`
                : ''}
            </p>

            <ul className="space-y-1.5">
              {(BOOST_TIERS[boostState.boost_tier as keyof typeof BOOST_TIERS]?.inclusions || []).map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground">
              Boost expires{' '}
              <span className="font-medium text-foreground">
                {boostState.featured_until
                  ? format(parseISO(boostState.featured_until), 'dd MMM yyyy')
                  : 'soon'}
              </span>.
              {' '}Renew for another 30 days anytime.
            </p>
          </>
        ) : isBoostPending ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px]">Pending activation</Badge>
                <span className="text-sm font-bold">
                  {BOOST_TIERS[boostState.boost_requested_tier || '']?.label || 'Featured'} boost
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">
                  {BOOST_TIERS[boostState.boost_requested_tier || '']?.priceLabel || '$49'}
                </span>
                <span className="text-xs text-muted-foreground">/month</span>
                <p className="text-[10px] text-muted-foreground">charged on activation</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{getActivationMessage()}</p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">What you're getting</p>
              {(BOOST_TIERS[boostState.boost_requested_tier || '']?.inclusions || []).map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </p>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-foreground">What happens next</p>
              {[
                'ListHQ team receives your request',
                'We activate your boost — usually within 1 business hour',
                'Your listing goes live in the featured grid near ' + listing.suburb,
                'Your card is charged $' + (BOOST_TIERS[boostState.boost_requested_tier || '']?.price || 49) + '/month from activation date',
                'Cancel anytime from this tab — no lock-in',
              ].map((step, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-muted text-[9px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </p>
              ))}
            </div>

            <div className="mt-2">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline">
                  Cancel this request
                </button>
              ) : (
                <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-xs font-medium text-destructive mb-1">Cancel boost request?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your request will be withdrawn. No charge has been made.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={handleCancelBoost} disabled={!!boostLoading}>
                      {boostLoading === 'cancelling' ? <Loader2 size={11} className="animate-spin mr-1"/> : null}
                      Yes, cancel
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCancelConfirm(false)}>
                      Keep request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  <h3 className="text-sm font-bold">Boost this listing</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Dramatically cheaper than REA</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Appear in the featured grid shown to buyers searching near{' '}
              <span className="font-medium text-foreground">{listing.suburb}</span>.
              Monthly subscription — cancel anytime from this tab.
            </p>

            {showPaymentStep && (() => {
              const tier = showPaymentStep;
              const tierData = BOOST_TIERS[tier];
              return (
                <div className="border-2 border-primary rounded-2xl p-5 mb-3 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Zap size={15} className="text-amber-500" />
                      Confirm your boost
                    </h4>
                    <button
                      onClick={() => setShowPaymentStep(null)}
                      className="text-xs text-muted-foreground hover:text-foreground">
                      ✕ Back
                    </button>
                  </div>
                  <div className="bg-secondary rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{tierData.label} boost</span>
                      <span className="text-sm font-bold">{tierData.priceLabel}/month</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {listing.address}, {listing.suburb}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3 dark:bg-amber-500/10 dark:border-amber-500/20">
                      <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-px" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-400 mb-0.5">Payment on activation</p>
                        <p>
                          Online card payment is coming very soon. For now, our team will contact you to arrange
                          payment when we activate your boost — usually within 1 business hour.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        setShowPaymentStep(null);
                        await handleRequestBoost(tier);
                      }}
                      disabled={!!boostLoading}>
                      {boostLoading === tier
                        ? <Loader2 size={13} className="animate-spin mr-2" />
                        : <Zap size={13} className="mr-2" />}
                      Confirm — request {tierData.label}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPaymentStep(null)}>
                      Back
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-3">
                    By confirming you agree to be billed {tierData.priceLabel}/month from activation date. Cancel anytime.
                  </p>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Featured card */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Featured
                </Badge>
                <div>
                  <span className="text-2xl font-bold">$49</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Cancel anytime · no lock-in</p>
                <ul className="space-y-1.5">
                  {BOOST_TIERS.featured.inclusions.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowPaymentStep('featured')}
                  disabled={!!boostLoading}
                >
                  Start Featured — $49/mo
                </Button>
              </div>

              {/* Premier card */}
              <div className="border-2 border-primary rounded-xl p-4 space-y-3 relative">
                <span className="absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Most popular
                </span>
                <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                  Premier
                </Badge>
                <div>
                  <span className="text-2xl font-bold">$99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Cancel anytime · no lock-in</p>
                <ul className="space-y-1.5">
                  {BOOST_TIERS.premier.inclusions.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowPaymentStep('premier')}
                  disabled={!!boostLoading}
                >
                  Start Premier — $99/mo
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Payment processed on activation by the ListHQ team · usually within 1 business hour · Questions?{' '}
              <a href="mailto:support@listhq.com.au" className="underline">support@listhq.com.au</a>
            </p>
          </>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loadingStats ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total views</p>
              </div>
              <p className="text-lg font-bold">{totalViews.toLocaleString()}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Enquiries</p>
              </div>
              <p className="text-lg font-bold text-primary">{totalEnquiries}</p>
              {hotLeads > 0 && (
                <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                  <Flame size={10} />
                  {hotLeads} hot lead{hotLeads !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Days listed</p>
              </div>
              <p className={`text-lg font-bold ${domColor}`}>{daysOnMarket}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget</p>
              </div>
              <p className="text-lg font-bold">{AUD.format(budget)}</p>
            </div>
          </>
        )}
      </div>

      {/* ── VIEWS CHART ── */}
      {!loadingStats && weeklyViews.some(d => d.views > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" />
            Views — last 28 days
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyViews}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis hide allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="views" radius={[3, 3, 0, 0]}>
                {weeklyViews.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.views > 0
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── BUYER ENQUIRIES ── */}
      {!loadingStats && leads.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MessageCircle size={16} className="text-primary" />
              Buyer enquiries
              <Badge variant="secondary" className="text-[10px] ml-1">
                {leads.length}
              </Badge>
            </h3>
            {leads.length > 5 && onViewAllLeads && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onViewAllLeads}>
                View all {leads.length}
                <ChevronRight size={14} />
              </Button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3 hidden sm:table-cell">Contact</th>
                <th className="text-left p-3">Urgency</th>
                <th className="text-right p-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map(l => {
                const u = URGENCY_LABEL[l.urgency] || URGENCY_LABEL.just_browsing;
                return (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3 font-medium">{l.user_name}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {l.user_email && <Mail size={14} className="text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] ${u.className}`}>
                        {u.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs hidden sm:table-cell">
                      {AU_DATE(l.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VENDOR REPORT ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Mail size={16} className="text-primary" />
          Send vendor report
        </h3>
        <p className="text-xs text-muted-foreground">
          Email your vendor a campaign summary — views, enquiries, hot leads, and days on market.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Vendor name</Label>
            <Input
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="e.g. John Smith"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Vendor email</Label>
            <Input
              type="email"
              value={vendorEmail}
              onChange={e => setVendorEmail(e.target.value)}
              placeholder="vendor@email.com"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button onClick={handleSendReport} disabled={sending} size="sm" className="gap-2">
          {sending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send size={14} />
              Send report
            </>
          )}
        </Button>

        {pastReports.length > 0 && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock size={12} /> Previously sent
            </p>
            <div className="space-y-2">
              {pastReports.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{r.vendor_email}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(r.sent_at), 'dd MMM yyyy')}
                    {' · '}
                    {r.views_at_send} views · {r.enquiries_at_send} enquiries
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ListingMarketingTab;

// ── Vendor report HTML builder ──

function buildVendorReportHtml(params: {
  vendorName: string;
  agentName: string;
  agentAgency: string;
  address: string;
  suburb: string;
  totalViews: number;
  totalEnquiries: number;
  hotLeads: number;
  daysOnMarket: number;
  budget: number;
  listingPrice: string;
  weeklyViews: { day: string; views: number }[];
}): string {
  const {
    vendorName, agentName, agentAgency, address, suburb,
    totalViews, totalEnquiries, hotLeads, daysOnMarket,
    budget, listingPrice, weeklyViews
  } = params;

  const maxViews = Math.max(...weeklyViews.map(d => d.views), 1);
  const last7 = weeklyViews.slice(-7);
  const sparkRows = last7.map(d => {
    const pct = Math.round((d.views / maxViews) * 100);
    return `
      <td style="vertical-align:bottom;text-align:center;padding:0 2px;">
        <div style="width:24px;height:${Math.max(pct, 4)}px;background:#3B82F6;border-radius:3px 3px 0 0;margin:0 auto;"></div>
        <div style="font-size:9px;color:#888;margin-top:4px;">${d.day.split(' ')[0]}</div>
      </td>
    `;
  }).join('');

  const AUD_EMAIL = new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', minimumFractionDigits: 0
  });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">

  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:20px;font-weight:700;color:#1a1a2e;">ListHQ</div>
  </div>

  <div style="background:#ffffff;border-radius:16px;padding:28px 24px;margin-bottom:16px;">
    <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">Vendor Campaign Report</div>

    <p style="font-size:14px;color:#555;margin:16px 0 8px;">Hi ${vendorName},</p>
    <p style="font-size:14px;color:#555;margin:0 0 8px;">
      Here is the latest campaign update for your property at
      <strong>${address}, ${suburb}</strong>.
    </p>
    <p style="font-size:12px;color:#888;margin:0 0 20px;">
      Prepared by ${agentName}${agentAgency ? ` · ${agentAgency}` : ''}
    </p>
  </div>

  <div style="background:#ffffff;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;padding:8px;">
          <div style="font-size:24px;font-weight:700;color:#1a1a2e;">${totalViews.toLocaleString()}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Total views</div>
        </td>
        <td style="text-align:center;padding:8px;">
          <div style="font-size:24px;font-weight:700;color:#3B82F6;">${totalEnquiries}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Enquiries</div>
        </td>
        <td style="text-align:center;padding:8px;">
          <div style="font-size:24px;font-weight:700;color:#EF4444;">${hotLeads}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Hot leads</div>
        </td>
        <td style="text-align:center;padding:8px;">
          <div style="font-size:24px;font-weight:700;color:#1a1a2e;">${daysOnMarket}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Days listed</div>
        </td>
      </tr>
    </table>
  </div>

  ${last7.some(d => d.views > 0) ? `
  <div style="background:#ffffff;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
    <div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:12px;">Views — last 7 days</div>
    <table style="width:100%;border-collapse:collapse;height:60px;">
      <tr>${sparkRows}</tr>
    </table>
  </div>` : ''}

  ${listingPrice ? `
  <div style="background:#ffffff;border-radius:16px;padding:16px 24px;margin-bottom:16px;">
    <span style="font-size:12px;color:#888;">Listing price:</span>
    <span style="font-size:14px;font-weight:700;color:#1a1a2e;margin-left:8px;">${listingPrice}</span>
    ${budget > 0 ? `<span style="font-size:12px;color:#888;margin-left:16px;">Budget: ${AUD_EMAIL.format(budget)}</span>` : ''}
  </div>` : ''}

  <div style="text-align:center;padding:16px 0;">
    <div style="font-size:11px;color:#aaa;">Sent via ListHQ · globalhomes.lovable.app</div>
  </div>
</div>
</body></html>`;
}
