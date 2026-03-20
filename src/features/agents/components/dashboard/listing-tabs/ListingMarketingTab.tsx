import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, subDays, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Eye, MessageCircle, Calendar, DollarSign, Download, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

const URGENCY_MAP: Record<string, { label: string; className: string }> = {
  ready_to_buy: { label: 'Hot', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  actively_looking: { label: 'Warm', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  just_browsing: { label: 'Cold', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

interface Props {
  listing: any;
  onViewAllLeads?: () => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ListingMarketingTab = ({ listing, onViewAllLeads }: Props) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [weeklyViews, setWeeklyViews] = useState<{ day: string; views: number }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);

      // Fetch leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('property_id', listing.id);
      setLeads(leadsData || []);

      // Fetch weekly view events
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: events } = await supabase
        .from('lead_events')
        .select('created_at, event_type')
        .eq('property_id', listing.id)
        .eq('event_type', 'view')
        .gte('created_at', sevenDaysAgo);

      // Group by day of week
      const dayCounts: Record<string, number> = {};
      DAY_LABELS.forEach(d => (dayCounts[d] = 0));
      (events || []).forEach((e: any) => {
        const date = parseISO(e.created_at);
        const dayIdx = (date.getDay() + 6) % 7; // Mon=0
        const label = DAY_LABELS[dayIdx];
        dayCounts[label] = (dayCounts[label] || 0) + 1;
      });
      setWeeklyViews(DAY_LABELS.map(d => ({ day: d, views: dayCounts[d] })));

      setLoadingStats(false);
    };
    fetchStats();
  }, [listing.id]);

  const daysOnMarket = listing.listed_date
    ? differenceInDays(new Date(), parseISO(listing.listed_date))
    : 0;
  const hotLeads = leads.filter(l => l.urgency === 'ready_to_buy').length;
  const totalViews = listing.views || 0;
  const totalEnquiries = listing.contact_clicks || leads.length || 0;
  const budget = listing.marketing_budget || 0;

  const domColor = daysOnMarket <= 21 ? 'text-green-500' : daysOnMarket <= 42 ? 'text-amber-500' : 'text-destructive';
  const hasChartData = weeklyViews.some(w => w.views > 0);

  const handleSendReport = async () => {
    if (!vendorName.trim() || !vendorEmail.trim()) {
      toast.error('Please enter vendor name and email');
      return;
    }
    setSendingReport(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: vendorEmail.trim(),
          subject: `Weekly campaign update — ${listing.address}`,
          body:
            `Hi ${vendorName.trim()},\n\n` +
            `Here is your weekly campaign summary for ${listing.address}:\n\n` +
            `Views this week: ${totalViews}\n` +
            `Total enquiries: ${totalEnquiries}\n` +
            `Hot leads: ${hotLeads}\n` +
            `Days on market: ${daysOnMarket}\n\n` +
            `We will be in touch with any updates.\n\nKind regards`,
        },
      });
      if (error) throw error;
      toast.success(`Vendor report sent to ${vendorEmail.trim()}`);
      setVendorName('');
      setVendorEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send vendor report');
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* A) Stat cards */}
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
                <p className="text-[10px] text-muted-foreground uppercase">Total Views</p>
              </div>
              <p className="text-lg font-display font-bold">{totalViews.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase">Enquiries</p>
              </div>
              <p className="text-lg font-display font-bold text-primary">{totalEnquiries}</p>
              {hotLeads > 0 && (
                <p className="text-[10px] text-destructive mt-0.5">{hotLeads} hot lead{hotLeads !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase">Days on Market</p>
              </div>
              <p className="text-lg font-display font-bold">{daysOnMarket}</p>
              <p className={`text-[10px] ${domColor} mt-0.5`}>
                {daysOnMarket <= 21 ? 'Fresh listing' : daysOnMarket <= 42 ? 'Moderate' : 'Extended'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={14} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase">Marketing Budget</p>
              </div>
              <p className="text-lg font-display font-bold">{AUD.format(budget)}</p>
            </div>
          </>
        )}
      </div>

      {/* B) Weekly views chart */}
      {!loadingStats && hasChartData && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" /> Views this week
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyViews}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* C) Leads breakdown */}
      {!loadingStats && leads.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MessageCircle size={16} className="text-primary" /> Buyer enquiries
            </h3>
            <Badge variant="secondary" className="text-[10px]">{leads.length}</Badge>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Urgency</th>
                <th className="text-right p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead: any) => {
                const urgency = URGENCY_MAP[lead.urgency] || URGENCY_MAP.just_browsing;
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3 font-medium">{lead.user_name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {lead.user_email && <Mail size={14} className="text-muted-foreground" />}
                        {lead.user_phone && <Phone size={14} className="text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] ${urgency.className}`}>
                        {urgency.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-xs">
                      {format(parseISO(lead.created_at), 'dd/MM/yyyy')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {leads.length > 5 && onViewAllLeads && (
            <div className="p-3 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onViewAllLeads}>
                View all {leads.length} leads
              </Button>
            </div>
          )}
        </div>
      )}

      {/* D) Vendor report */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Mail size={16} className="text-primary" /> Send vendor report
        </h3>
        <p className="text-xs text-muted-foreground">
          Email your vendor a weekly campaign summary showing views, enquiries, and open home results.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Vendor name</Label>
            <Input
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="Vendor name"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Vendor email</Label>
            <Input
              type="email"
              value={vendorEmail}
              onChange={e => setVendorEmail(e.target.value)}
              placeholder="vendor@email.com"
              className="h-9"
            />
          </div>
        </div>
        <Button onClick={handleSendReport} disabled={sendingReport} size="sm" className="gap-2">
          <Mail size={14} /> {sendingReport ? 'Sending…' : 'Send Report'}
        </Button>
      </div>
    </div>
  );
};

export default ListingMarketingTab;
