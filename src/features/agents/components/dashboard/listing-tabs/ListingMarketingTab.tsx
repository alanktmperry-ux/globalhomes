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
  Zap, Star, CheckCircle2
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
  const [boostRequesting, setBoostRequesting] = useState(false);

  const [vendorName, setVendorName] = useState(listing.vendor_name || '');
  const [vendorEmail, setVendorEmail] = useState(listing.vendor_email || '');
  const [sending, setSending] = useState(false);

  const isFeaturedActive = listing.is_featured && listing.featured_until && new Date(listing.featured_until) > new Date();
  const isBoostPending = listing.boost_requested_at && !listing.is_featured;

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
    setBoostRequesting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          boost_requested_at: new Date().toISOString(),
          boost_requested_tier: tier,
        } as any)
        .eq('id', listing.id);

      if (error) throw error;

      // Get agent info for notification email
      const { data: agent } = await supabase
        .from('agents')
        .select('name, email')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();

      // Send notification email to admin
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: 'alan@everythingeco.com.au',
          subject: `Boost request: ${listing.address} — ${tier} — ${agent?.name || 'Unknown agent'}`,
          html: `<p><strong>Boost Request</strong></p>
            <p><strong>Property:</strong> ${listing.address}, ${listing.suburb}</p>
            <p><strong>Tier:</strong> ${tier}</p>
            <p><strong>Agent:</strong> ${agent?.name || 'Unknown'} (${agent?.email || 'N/A'})</p>
            <p><strong>Property ID:</strong> ${listing.id}</p>`,
        },
      });

      // Update local listing state
      listing.boost_requested_at = new Date().toISOString();
      listing.boost_requested_tier = tier;

      toast.success("Boost request sent — we'll activate your listing within 1 business hour.");
    } catch (err) {
      console.error(err);
      toast.error('Failed to request boost — please try again.');
    }
    setBoostRequesting(false);
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
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {isFeaturedActive ? (
          <>
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-500/15 text-teal-500 border-0 text-[10px]">Active</Badge>
              <Badge variant="outline" className="text-[10px]">
                {listing.boost_tier === 'premier' ? 'Premier' : 'Featured'}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground">
              This listing is featured until {format(parseISO(listing.featured_until), 'dd MMM yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              Your listing is appearing in the featured grid to buyers searching near {listing.suburb}.
            </p>
          </>
        ) : isBoostPending ? (
          <>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px]">Pending</Badge>
            </div>
            <p className="text-sm font-medium text-foreground">
              Boost request received — {listing.boost_requested_tier === 'premier' ? 'Premier' : 'Featured'} · Requested {format(parseISO(listing.boost_requested_at), 'dd MMM yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              We will activate your boost within 1 business hour. Questions? Email alan@everythingeco.com.au
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-primary" />
              <h3 className="text-sm font-bold">Boost this listing</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Appear in the featured listings grid shown to buyers searching near {listing.suburb}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* Featured card */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Featured</span>
                  <span className="text-sm font-bold text-foreground">$299</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-primary shrink-0" /> Featured badge on your listing</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-primary shrink-0" /> Homepage featured grid (30 days)</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-primary shrink-0" /> Shown to buyers near {listing.suburb}</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-primary shrink-0" /> Higher search placement</li>
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={boostRequesting}
                  onClick={() => handleRequestBoost('featured')}
                >
                  {boostRequesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Request Featured
                </Button>
              </div>
              {/* Premier card */}
              <div className="border-2 border-primary rounded-xl p-4 space-y-3 relative">
                <span className="absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Most popular</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Premier</span>
                  <span className="text-sm font-bold text-foreground">$599</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><Star size={12} className="text-primary shrink-0" /> Everything in Featured</li>
                  <li className="flex items-center gap-1.5"><Star size={12} className="text-primary shrink-0" /> Top of search results in {listing.suburb}</li>
                  <li className="flex items-center gap-1.5"><Star size={12} className="text-primary shrink-0" /> Email alert to matching saved searches</li>
                  <li className="flex items-center gap-1.5"><Star size={12} className="text-primary shrink-0" /> Hero image slot on homepage (30 days)</li>
                </ul>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  disabled={boostRequesting}
                  onClick={() => handleRequestBoost('premier')}
                >
                  {boostRequesting ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                  Request Premier
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Payment processed on activation. Boosts activate within 1 business hour.
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
