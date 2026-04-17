import { useState, useEffect, useCallback } from 'react';
import { usePartner } from './PartnerDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Building2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface OverdueTenancy {
  id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent_amount: number;
  rent_frequency: string;
  agent_id: string;
  properties: { address: string; suburb: string } | null;
  agencyName: string;
  agencyId: string;
  daysBehind: number;
  amountOwed: number;
}

const toWeekly = (amount: number, freq: string): number => {
  if (freq === 'weekly') return amount;
  if (freq === 'fortnightly') return amount / 2;
  if (freq === 'monthly') return (amount * 12) / 52;
  return amount;
};

const PartnerArrearsPage = () => {
  const { agencies } = usePartner();
  const { user } = useAuth();
  const [overdue, setOverdue] = useState<OverdueTenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [autoLogs, setAutoLogs] = useState<Record<string, string>>({}); // tenant_email -> last sent date
  const [togglingAuto, setTogglingAuto] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || agencies.length === 0) { setLoading(false); return; }
    setLoading(true);

    const agentIds = agencies.map(a => a.agentId).filter(Boolean);
    if (agentIds.length === 0) { setOverdue([]); setLoading(false); return; }

    const { data: tenancies } = await supabase
      .from('tenancies')
      .select('id, tenant_name, tenant_email, tenant_phone, rent_amount, rent_frequency, agent_id, properties(address, suburb)')
      .in('agent_id', agentIds)
      .eq('status', 'active');

    if (!tenancies || tenancies.length === 0) { setOverdue([]); setLoading(false); return; }

    const tIds = tenancies.map((t: any) => t.id);
    const { data: payments } = await supabase
      .from('rent_payments')
      .select('tenancy_id, period_to, status')
      .in('tenancy_id', tIds)
      .order('period_to', { ascending: false });

    const today = new Date();
    const latestMap = new Map<string, string>();
    const overdueSet = new Set<string>();
    for (const p of (payments || []) as any[]) {
      if (!latestMap.has(p.tenancy_id)) latestMap.set(p.tenancy_id, p.period_to);
      if (p.status === 'overdue') overdueSet.add(p.tenancy_id);
    }

    const agencyMap = new Map(agencies.map(a => [a.agentId, a]));

    const results: OverdueTenancy[] = [];
    for (const t of tenancies as any[]) {
      const hasOverdue = overdueSet.has(t.id);
      const latestPeriod = latestMap.get(t.id);
      const daysBehind = latestPeriod ? differenceInDays(today, new Date(latestPeriod)) : 0;

      if (!hasOverdue && daysBehind <= 0) continue;

      const weekly = toWeekly(t.rent_amount, t.rent_frequency);
      const weeksOwed = Math.max(1, Math.ceil(daysBehind / 7));
      const agency = agencyMap.get(t.agent_id);

      results.push({
        ...t,
        agencyName: agency?.name || 'Unknown',
        agencyId: agency?.id || '',
        daysBehind,
        amountOwed: weekly * weeksOwed,
      });
    }

    results.sort((a, b) => b.daysBehind - a.daysBehind);
    setOverdue(results);
    setLoading(false);
  }, [user, agencies]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSendReminder = async (t: OverdueTenancy) => {
    if (!t.tenant_email || !user) {
      toast.error('No email address for this tenant');
      return;
    }
    setSendingId(t.id);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: t.tenant_email,
          subject: 'Rent overdue reminder',
          html: `<h2>Rent Overdue Reminder</h2><p>Dear ${t.tenant_name},</p><p>This is a reminder that your rent payment for <strong>${t.properties?.address || 'your property'}</strong> is overdue by <strong>${t.daysBehind} days</strong>.</p><p>Amount outstanding: <strong>$${t.amountOwed.toFixed(2)}</strong></p><p>Please arrange payment at your earliest convenience.</p><p>Regards,<br/>Property Management Team</p>`,
        },
      });
      if (error) throw error;

      // Log activity
      const { data: membership } = await supabase.from('partner_members').select('partner_id').eq('user_id', user.id).maybeSingle();
      if (membership) {
        await (supabase as any).from('partner_activity_log').insert({
          partner_id: (membership as any).partner_id,
          agency_id: t.agencyId,
          action_type: 'arrears_reminder_sent',
          entity_type: 'tenancies',
          entity_id: t.id,
          description: `Sent arrears reminder to ${t.tenant_name} at ${t.properties?.address || ''}`,
        });
      }

      toast.success(`Reminder sent to ${t.tenant_email}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to send reminder');
    }
    setSendingId(null);
  };

  if (agencies.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No active client agencies. Accept an invitation from your overview page.</p>
      </div>
    );
  }

  // Group by agency
  const agencyGroups = new Map<string, OverdueTenancy[]>();
  for (const t of overdue) {
    if (!agencyGroups.has(t.agencyName)) agencyGroups.set(t.agencyName, []);
    agencyGroups.get(t.agencyName)!.push(t);
  }

  const totalOverdue = overdue.length;
  const totalAgencies = agencyGroups.size;

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Arrears</h1>
        {totalOverdue > 0 ? (
          <p className="text-sm text-muted-foreground mt-1">
            {totalOverdue} overdue tenant{totalOverdue !== 1 ? 's' : ''} across {totalAgencies} agenc{totalAgencies !== 1 ? 'ies' : 'y'}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">Cross-agency arrears monitoring</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">Automated arrears sequences: {autoOn ? 'ON' : 'OFF'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {autoOn ? 'Day 1, 3, 7, 14 reminders active — running daily at 8am' : 'Manual reminders only'}
          </p>
        </div>
        <Button size="sm" variant={autoOn ? 'outline' : 'default'} onClick={toggleAuto} disabled={togglingAuto}>
          {togglingAuto && <Loader2 size={12} className="animate-spin mr-1"/>}
          Turn {autoOn ? 'OFF' : 'ON'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : totalOverdue === 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-4 py-8 justify-center">
            <CheckCircle className="text-emerald-500" size={28} />
            <div>
              <p className="font-semibold text-foreground">All accounts current</p>
              <p className="text-sm text-muted-foreground">No overdue tenants across your client agencies.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Array.from(agencyGroups.entries()).map(([agencyName, tenants]) => (
          <div key={agencyName}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">{agencyName}</h2>
              <Badge variant="destructive" className="text-xs">{tenants.length}</Badge>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Amount Owed</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map(t => {
                      const lastAuto = t.tenant_email ? autoLogs[t.tenant_email] : null;
                      const lastDays = lastAuto ? Math.floor((Date.now() - new Date(lastAuto).getTime()) / 86400000) : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">
                            {t.properties?.address || '—'}
                            <span className="block text-xs text-muted-foreground">{t.properties?.suburb}</span>
                            {lastDays != null ? (
                              <Badge className="mt-1 bg-blue-500/15 text-blue-700 border-0 text-[10px]">Auto-reminded {lastDays}d ago</Badge>
                            ) : (
                              <Badge className="mt-1 bg-muted text-muted-foreground border-0 text-[10px]">No auto-reminder sent</Badge>
                            )}
                          </TableCell>
                          <TableCell>{t.tenant_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.tenant_phone || '—'}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-0 text-xs">
                              {t.daysBehind} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-red-600">
                            ${t.amountOwed.toFixed(0)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleSendReminder(t)}
                              disabled={sendingId === t.id || !t.tenant_email}
                            >
                              {sendingId === t.id ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                              Remind
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
};

export default PartnerArrearsPage;
