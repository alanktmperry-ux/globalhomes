import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  APlusPageHeader, APlusStatCard, APlusTable, APlusTHead, APlusTh, APlusTBody, APlusTr, APlusTd,
  APlusBadge, APlusArrearsBanner, type APlusBadgeTone,
} from '@/components/ui/data-table-aplus';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

type ArrearsStatus = 'none' | 'notice_sent' | 'responded' | 'escalated' | 'resolved';

interface PropertyRef {
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
}

interface TenancyRow {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent_amount: number | null;
  rent_frequency: string | null;
  lease_start: string | null;
  bond_amount: number | null;
  status: string | null;
  notes: string | null;
  arrears_action_status: ArrearsStatus | null;
  last_arrears_notice_date: string | null;
  agent_id: string | null;
  properties?: PropertyRef | null;
}

interface ArrearsItem extends TenancyRow {
  daysOverdue: number;
  weeklyRate: number;
  amountOwing: number;
}

const STATE_NOTICE: Record<string, { title: string; days: number }> = {
  VIC: { title: 'Notice to Remedy — Residential Tenancies Act 1997 (Vic)', days: 14 },
  NSW: { title: 'Breach Notice — Residential Tenancies Act 2010 (NSW)', days: 14 },
  QLD: { title: 'Notice to Remedy Breach (Form 11) — Residential Tenancies and Rooming Accommodation Act 2008 (Qld)', days: 7 },
  WA: { title: 'Breach of Agreement Notice — Residential Tenancies Act 1987 (WA)', days: 14 },
  SA: { title: 'Notice to Tenant (Breach) — Residential Tenancies Act 1995 (SA)', days: 14 },
  ACT: { title: 'Notice to Remedy Breach — Residential Tenancies Act 1997 (ACT)', days: 14 },
  TAS: { title: 'Notice to Remedy Breach — Residential Tenancy Act 1997 (Tas)', days: 14 },
  NT: { title: 'Notice to Remedy Breach — Residential Tenancies Act 1999 (NT)', days: 14 },
};

const STATUS_META: Record<ArrearsStatus, { label: string; tone: APlusBadgeTone }> = {
  none:         { label: 'No action',   tone: 'grey' },
  notice_sent:  { label: 'Notice sent', tone: 'amber' },
  responded:    { label: 'Responded',   tone: 'blue' },
  escalated:    { label: 'Escalated',   tone: 'red' },
  resolved:     { label: 'Resolved',    tone: 'green' },
};

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

const ArrearsPage = () => {
  const navigate = useNavigate();
  const { agent } = useCurrentAgent();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ArrearsItem[]>([]);
  const [agentName, setAgentName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');
  const [noticeFor, setNoticeFor] = useState<ArrearsItem | null>(null);
  const [noticeText, setNoticeText] = useState('');

  const loadArrears = async () => {
    if (!agent?.id) return;
    setLoading(true);

    setAgentName(agent.name || '');
    setAgencyName((agent as any).agency_name || (agent as any).agency || '');

    const { data: tenancies, error } = await supabase
      .from('tenancies')
      .select(`
        id, tenant_name, tenant_email, tenant_phone, rent_amount, rent_frequency,
        lease_start, bond_amount, status, notes, arrears_action_status, last_arrears_notice_date, agent_id,
        properties:property_id ( address, suburb, state )
      `)
      .eq('agent_id', agent.id)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load tenancies for arrears', error);
      setLoading(false);
      return;
    }

    const tenancyRows = (tenancies || []) as unknown as TenancyRow[];
    if (tenancyRows.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: payments } = await supabase
      .from('rent_payments')
      .select('id, tenancy_id, amount, period_to, status, payment_date')
      .in('tenancy_id', tenancyRows.map(t => t.id))
      .order('payment_date', { ascending: false });

    const today = new Date();
    const computed: ArrearsItem[] = [];
    for (const t of tenancyRows) {
      const latest = (payments || []).find(p => p.tenancy_id === t.id);
      const referenceDate = latest?.period_to || t.lease_start;
      if (!referenceDate) continue;
      const daysOverdue = Math.floor((today.getTime() - new Date(referenceDate).getTime()) / 86400000);
      if (daysOverdue <= 3) continue;
      if (latest && latest.status === 'paid' && daysOverdue <= 3) continue;

      const rent = Number(t.rent_amount || 0);
      const freq = (t.rent_frequency || 'weekly').toLowerCase();
      const weeklyRate =
        freq === 'fortnightly' ? rent / 2 :
        freq === 'monthly' ? (rent * 12) / 52 :
        rent;
      const amountOwing = Math.floor(daysOverdue / 7) * weeklyRate;

      computed.push({ ...t, daysOverdue, weeklyRate, amountOwing });
    }

    computed.sort((a, b) => b.daysOverdue - a.daysOverdue);
    setItems(computed);
    setLoading(false);
  };

  useEffect(() => {
    loadArrears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  const summary = useMemo(() => {
    const totalOwing = items.reduce((s, i) => s + i.amountOwing, 0);
    const critical = items.filter(i => i.daysOverdue >= 14).length;
    return { count: items.length, totalOwing, critical };
  }, [items]);

  const openBreachNotice = async (row: ArrearsItem) => {
    const stateCode = (row.properties?.state || '').toUpperCase();
    const cfg = STATE_NOTICE[stateCode] || { title: 'Breach Notice', days: 14 };
    const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const propLine = [row.properties?.address, row.properties?.suburb, row.properties?.state].filter(Boolean).join(', ');

    // Fetch primary + co-tenant contacts so the notice addresses everyone on the lease
    const { data: contacts } = await supabase
      .from('tenancy_contacts' as any)
      .select('name, contact_type')
      .eq('tenancy_id', row.id)
      .in('contact_type', ['primary_tenant', 'co_tenant']);
    const names: string[] = [];
    const primary = (contacts as any[] | null)?.find(c => c.contact_type === 'primary_tenant')?.name;
    if (primary) names.push(primary);
    else if (row.tenant_name) names.push(row.tenant_name);
    (contacts as any[] | null)?.filter(c => c.contact_type === 'co_tenant').forEach(c => names.push(c.name));
    const toLine = names.length > 0 ? names.join(' & ') : 'Tenant';

    const text =
`${cfg.title}

Date: ${dateStr}

To: ${toLine}
Property: ${propLine || '—'}

This notice is to advise that you are in breach of your tenancy agreement for the following reason:

RENT ARREARS

Amount outstanding: ${fmtMoney(row.amountOwing)}
Days in arrears: ${row.daysOverdue} days
(Rent is due ${row.rent_frequency || 'weekly'} at ${fmtMoney(Number(row.rent_amount || 0))})

You are required to remedy this breach within ${cfg.days} days of this notice by paying the full amount outstanding.

If this breach is not remedied within ${cfg.days} days, further action may be taken including an application to the relevant tenancy tribunal.

Regards,

${agentName || 'Property Manager'}
${agencyName || ''}`.trim();
    setNoticeFor(row);
    setNoticeText(text);
  };

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(noticeText);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const markNoticeSent = async () => {
    if (!noticeFor) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('tenancies')
      .update({ arrears_action_status: 'notice_sent', last_arrears_notice_date: today } as any)
      .eq('id', noticeFor.id);
    if (error) {
      toast.error('Could not update tenancy');
      return;
    }
    toast.success('Marked notice as sent');
    setNoticeFor(null);
    loadArrears();
  };

  const updateStatus = async (id: string, status: ArrearsStatus) => {
    const { error } = await supabase
      .from('tenancies')
      .update({ arrears_action_status: status } as any)
      .eq('id', id);
    if (error) {
      toast.error('Could not update status');
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, arrears_action_status: status } : i));
  };

  const daysCellClass = (d: number) => {
    if (d >= 14) return 'text-red-700 font-bold';
    if (d >= 7) return 'text-orange-600 font-medium';
    return 'text-amber-600';
  };

  const daysPrefix = (d: number) => {
    if (d >= 14) return ' ';
    if (d >= 7) return ' ';
    return '';
  };

  const noticeStateCfg = noticeFor
    ? (STATE_NOTICE[(noticeFor.properties?.state || '').toUpperCase()] || { title: 'Breach Notice', days: 14 })
    : null;

  return (
    <div className="p-4 md:p-6">
      <APlusPageHeader title="Arrears" subtitle="Tenants with outstanding rent" />

      {summary.count > 0 && (
        <APlusArrearsBanner
          title={`${summary.count} tenant${summary.count === 1 ? '' : 's'} in arrears — ${fmtMoney(summary.totalOwing)} outstanding`}
          body={summary.critical > 0
            ? `${summary.critical} critical (14+ days). Review and issue breach notices below.`
            : 'Issue breach notices below if remediation is overdue.'}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <APlusStatCard label="Total in Arrears" value={summary.count} />
        <APlusStatCard label="Total Amount Owing" value={fmtMoney(summary.totalOwing)} />
        <APlusStatCard
          label="Critical (14+ days)"
          value={summary.critical}
          urgent={summary.critical > 0}
          icon="solar:danger-triangle-linear"
        />
      </div>

      {loading ? (
        <div
          className="bg-white rounded-[12px] p-10 text-center text-sm text-[#6B7280]"
          style={{ border: '1px solid #E5E7EB' }}
        >
          Loading arrears…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[12px] p-10" style={{ border: '1px solid #E5E7EB' }}>
          <EmptyState
            icon="solar:shield-check-linear"
            title="No tenants currently in arrears"
            body="When a tenant falls behind on rent, they will appear here with the days overdue and recommended action."
            variant="compact"
          />
        </div>
      ) : (
        <APlusTable>
          <APlusTHead>
            <APlusTh>Tenant</APlusTh>
            <APlusTh>Property</APlusTh>
            <APlusTh align="right">Days Overdue</APlusTh>
            <APlusTh align="right">Est. Amount Owing</APlusTh>
            <APlusTh>Last Notice</APlusTh>
            <APlusTh>Status</APlusTh>
            <APlusTh align="right">Actions</APlusTh>
          </APlusTHead>
          <APlusTBody>
            {items.map(row => {
              const status = (row.arrears_action_status || 'none') as ArrearsStatus;
              const meta = STATUS_META[status] || STATUS_META.none;
              const propLine = [row.properties?.address, row.properties?.suburb].filter(Boolean).join(', ');
              const daysColor = row.daysOverdue >= 14 ? 'text-[#991B1B]' : row.daysOverdue >= 7 ? 'text-[#C2410C]' : 'text-[#92400E]';
              return (
                <APlusTr key={row.id}>
                  <APlusTd>
                    <div className="font-semibold text-[#0a0f1e]">{row.tenant_name || '—'}</div>
                    {row.tenant_email && <div className="text-xs text-[#6B7280] mt-0.5">{row.tenant_email}</div>}
                  </APlusTd>
                  <APlusTd>{propLine || '—'}</APlusTd>
                  <APlusTd align="right">
                    <span className={`tabular-nums font-bold ${daysColor}`}>{row.daysOverdue}d</span>
                  </APlusTd>
                  <APlusTd align="right">
                    <span className="tabular-nums font-semibold text-[#991B1B]">{fmtMoney(row.amountOwing)}</span>
                  </APlusTd>
                  <APlusTd>
                    <span className="text-xs text-[#6B7280] tabular-nums whitespace-nowrap">
                      {row.last_arrears_notice_date
                        ? new Date(row.last_arrears_notice_date).toLocaleDateString('en-AU')
                        : '—'}
                    </span>
                  </APlusTd>
                  <APlusTd>
                    <APlusBadge tone={meta.tone} label={meta.label} />
                  </APlusTd>
                  <APlusTd align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openBreachNotice(row)} className="gap-1 h-8">
                        <FileText size={14} /> Breach Notice
                      </Button>
                      <Select value={status} onValueChange={(v) => updateStatus(row.id, v as ArrearsStatus)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No action</SelectItem>
                          <SelectItem value="notice_sent">Notice sent</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/tenancies/${row.id}`)} className="gap-1 h-8">
                        <ExternalLink size={14} /> View
                      </Button>
                    </div>
                  </APlusTd>
                </APlusTr>
              );
            })}
          </APlusTBody>
        </APlusTable>
      )}

      <Dialog open={!!noticeFor} onOpenChange={(open) => !open && setNoticeFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Breach Notice — {noticeFor?.tenant_name || 'Tenant'}</DialogTitle>
            {noticeStateCfg && (
              <div className="text-xs text-muted-foreground">
                {noticeStateCfg.title} · {noticeStateCfg.days} days to remedy
              </div>
            )}
          </DialogHeader>
          <Textarea
            readOnly
            value={noticeText}
            rows={20}
            className="font-mono text-xs"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyLetter} className="gap-1">
              <Copy size={14} /> Copy Letter
            </Button>
            <Button onClick={markNoticeSent}>Mark Notice Sent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArrearsPage;
