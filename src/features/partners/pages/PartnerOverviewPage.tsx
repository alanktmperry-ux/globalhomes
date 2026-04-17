import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePartner } from './PartnerDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Clock, Building2, Inbox, Mail, Users, AlertTriangle, Activity, Home, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface PartnerProfile {
  id: string;
  company_name: string;
  is_verified: boolean;
  contact_name: string;
  contact_email: string;
}

interface PendingInvite {
  id: string;
  agency_id: string;
  access_level: string;
  invite_token: string;
  invited_at: string;
  agencies: { name: string } | null;
}

interface ActivityItem {
  id: string;
  action_type: string;
  description: string | null;
  agency_id: string | null;
  created_at: string;
}

const ACCESS_LABELS: Record<string, string> = {
  trust_only: 'Trust only',
  trust_and_pm: 'Trust + PM',
  full_pm: 'Full PM',
};

const PartnerOverviewPage = () => {
  const { user } = useAuth();
  const { agencies } = usePartner();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [tenancyCount, setTenancyCount] = useState(0);
  const [arrearsCount, setArrearsCount] = useState(0);
  const [vacancyStats, setVacancyStats] = useState({ vacant: 0, vacatingMonth: 0, avgReLet: null as number | null, lossMonth: 0 });
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get partner via partner_members
    const { data: membership } = await supabase
      .from('partner_members')
      .select('partner_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }
    const partnerId = (membership as any).partner_id;

    const { data: p } = await supabase
      .from('partners')
      .select('id, company_name, is_verified, contact_name, contact_email')
      .eq('id', partnerId)
      .maybeSingle();

    if (!p) { setLoading(false); return; }
    setPartner(p as unknown as PartnerProfile);

    // Counts
    const [activeRes, pendingRes, invitesRes, activityRes] = await Promise.all([
      supabase.from('partner_agencies').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId).eq('status', 'active'),
      supabase.from('partner_agencies').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId).eq('status', 'pending'),
      supabase.from('partner_agencies').select('id, agency_id, access_level, invite_token, invited_at, agencies(name)').eq('partner_id', partnerId).eq('status', 'pending').order('invited_at', { ascending: false }),
      supabase.from('partner_activity_log' as any).select('id, action_type, description, agency_id, created_at').eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(10),
    ]);

    setActiveCount(activeRes.count || 0);
    setPendingCount(pendingRes.count || 0);
    if (invitesRes.data) setPendingInvites(invitesRes.data as unknown as PendingInvite[]);
    if (activityRes.data) setActivities(activityRes.data as unknown as ActivityItem[]);

    // Tenancy + arrears counts across all active agencies
    const { data: activeLinks } = await supabase
      .from('partner_agencies')
      .select('invited_by_agent_id')
      .eq('partner_id', partnerId)
      .eq('status', 'active');

    const agentIds = (activeLinks || []).map((l: any) => l.invited_by_agent_id).filter(Boolean);

    if (agentIds.length > 0) {
      const { data: tenancies } = await supabase
        .from('tenancies')
        .select('id, rent_amount, rent_frequency, status, lease_end, actual_vacate_date, re_let_date, days_to_re_let, vacancy_loss_aud')
        .in('agent_id', agentIds);

      const active = (tenancies || []).filter((t: any) => t.status === 'active');
      setTenancyCount(active.length);

      // Vacancy KPIs
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const vacant = (tenancies || []).filter((t: any) => t.status === 'ended' && !t.re_let_date);
      const vacatingMonth = (tenancies || []).filter((t: any) => {
        if (t.status !== 'vacating') return false;
        if (!t.lease_end) return true;
        const days = Math.floor((new Date(t.lease_end).getTime() - today.getTime()) / 86400000);
        return days <= 30;
      });
      const recentReLet = (tenancies || []).filter((t: any) => t.re_let_date && new Date(t.re_let_date) >= threeMonthsAgo && t.days_to_re_let != null);
      const avgReLet = recentReLet.length
        ? Math.round(recentReLet.reduce((s: number, t: any) => s + (t.days_to_re_let || 0), 0) / recentReLet.length)
        : null;
      const lossMonth = (tenancies || [])
        .filter((t: any) => t.re_let_date && new Date(t.re_let_date) >= monthStart)
        .reduce((s: number, t: any) => s + Number(t.vacancy_loss_aud || 0), 0);

      setVacancyStats({ vacant: vacant.length, vacatingMonth: vacatingMonth.length, avgReLet, lossMonth });

      if (active.length > 0) {
        const tIds = active.map((t: any) => t.id);
        const { data: payments } = await supabase
          .from('rent_payments')
          .select('tenancy_id, status')
          .in('tenancy_id', tIds)
          .eq('status', 'overdue');
        setArrearsCount(new Set((payments || []).map((p: any) => p.tenancy_id)).size);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAcceptInvite = async (invite: PendingInvite) => {
    setAcceptingId(invite.id);
    try {
      const { data, error } = await supabase.functions.invoke('accept-partner-invite', {
        body: { token: invite.invite_token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`You now have access to ${invite.agencies?.name || 'the agency'}`);
      await fetchData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setAcceptingId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Partner profile not found.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Active Clients', value: activeCount, icon: Building2 },
    { label: 'Pending Invitations', value: pendingCount, icon: Mail },
    { label: 'Total Tenancies', value: tenancyCount, icon: Users },
    { label: 'In Arrears', value: arrearsCount, icon: AlertTriangle },
  ];

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">
        Welcome, {partner.company_name}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">Partner dashboard overview</p>

      {/* Verification status */}
      {!partner.is_verified ? (
        <Card className="border-amber-500/30 bg-amber-500/5 mb-6">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="text-amber-500" size={20} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Account pending verification</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our team will review and approve your account within 24 hours. You will receive an email at <strong className="text-foreground">{partner.contact_email}</strong> when approved.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/5 mb-6">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Account verified</p>
              <p className="text-muted-foreground text-sm">You can now accept client agency invitations.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            Pending invitations
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="border-primary/20">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{invite.agencies?.name || 'Unknown agency'}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {format(new Date(invite.invited_at), 'dd/MM/yyyy')} · {ACCESS_LABELS[invite.access_level] || invite.access_level}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleAcceptInvite(invite)} disabled={acceptingId === invite.id}>
                    {acceptingId === invite.id ? <><Loader2 className="animate-spin mr-1" size={14} /> Accepting…</> : 'Accept'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {activities.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Recent activity
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activities.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{a.description || a.action_type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vacancy Summary — last section above empty state / footer */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Home size={18} className="text-primary" />
          Vacancy Summary
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vacant Properties</p>
            <p className={`text-xl font-bold ${vacancyStats.vacant > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{vacancyStats.vacant}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vacating This Month</p>
            <p className="text-xl font-bold text-amber-600">{vacancyStats.vacatingMonth}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Days to Re-let (3mo)</p>
            <p className="text-xl font-bold text-foreground">{vacancyStats.avgReLet ?? '—'}{vacancyStats.avgReLet != null ? ' days' : ''}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Vacancy Loss (Month)</p>
              <p className="text-xl font-bold text-red-600">${vacancyStats.lossMonth.toLocaleString('en-AU', { maximumFractionDigits: 0 })}</p>
            </div>
          </CardContent></Card>
        </div>
      </div>

      {/* Empty state */}
      {activeCount === 0 && pendingInvites.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto text-muted-foreground mb-4" size={40} />
            <h3 className="font-semibold text-foreground text-sm mb-2">No client agencies yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Once a client agency invites you, their account will appear here. Share your partner email with agencies to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerOverviewPage;
