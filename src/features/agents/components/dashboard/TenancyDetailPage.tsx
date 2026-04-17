import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Edit, Plus, AlertTriangle, Printer,
  CheckCircle2, Clock, Wrench, ChevronDown, ChevronUp, Copy, Mail, ExternalLink, AlertCircle, RefreshCw, FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';
import TenantPortalCard from './TenantPortalCard';
import OwnerPortalCard from './OwnerPortalCard';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/shared/lib/utils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

/* ─── Types ─── */
interface Tenancy {
  id: string;
  property_id: string;
  agent_id: string;
  tenant_contact_id: string | null;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  rent_frequency: string;
  bond_amount: number;
  bond_lodgement_number: string | null;
  bond_authority: string | null;
  management_fee_percent: number;
  owner_name: string | null;
  owner_email: string | null;
  owner_bsb: string | null;
  owner_account_number: string | null;
  status: string;
  notes: string | null;
  tenant_portal_token: string | null;
  renewal_status: string | null;
  renewal_offered_at: string | null;
  renewal_offered_rent: number | null;
  renewal_offered_lease_end: string | null;
  renewal_type: string | null;
  renewal_notes: string | null;
  created_at: string;
  updated_at: string;
  properties: { address: string; suburb: string; owner_portal_token?: string | null; owner_name?: string | null; owner_email?: string | null } | null;
}

interface RentPayment {
  id: string;
  tenancy_id: string;
  agent_id: string;
  amount: number;
  payment_date: string;
  period_from: string;
  period_to: string;
  receipt_number: string;
  payment_method: string;
  status: string;
  notes: string | null;
}

interface MaintenanceJob {
  id: string;
  tenancy_id: string | null;
  property_id: string;
  agent_id: string;
  reported_by: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_phone: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  created_at: string;
}

/* ─── Component ─── */
const TenancyDetailPage = () => {
  const { tenancyId } = useParams<{ tenancyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<{ name: string; agency: string | null; license_number: string | null } | null>(null);

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Statement
  const [statementMonth, setStatementMonth] = useState(new Date().getMonth());
  const [statementYear, setStatementYear] = useState(new Date().getFullYear());

  // Edit form
  const [editForm, setEditForm] = useState<Partial<Tenancy>>({});

  // Payment form
  const [payForm, setPayForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    period_from: '',
    period_to: '',
    amount: '',
    payment_method: 'bank_transfer',
    notes: '',
  });

  // Job form
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    priority: 'routine',
    assigned_to: '',
    estimated_cost: '',
  });

  // Job inline edit
  const [jobActualCost, setJobActualCost] = useState('');
  const [jobCompletedAt, setJobCompletedAt] = useState<Date | undefined>(undefined);

  // Renewal
  const [showRenewal, setShowRenewal] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    rent: '',
    lease_end: '',
    type: 'fixed',
    notes: '',
  });
  const [emailingOwner, setEmailingOwner] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || !tenancyId) return;
    setLoading(true);

    const { data: agentData } = await supabase
      .from('agents')
      .select('id, name, agency, license_number')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agentData) { setLoading(false); return; }
    setAgentId(agentData.id);
    setAgentInfo(agentData);

    const [tRes, pRes, jRes] = await Promise.all([
      supabase
        .from('tenancies')
        .select('*, properties(address, suburb, owner_portal_token, owner_name, owner_email)')
        .eq('id', tenancyId)
        .eq('agent_id', agentData.id)
        .single(),
      supabase
        .from('rent_payments')
        .select('*')
        .eq('tenancy_id', tenancyId)
        .order('payment_date', { ascending: false }),
      supabase
        .from('maintenance_jobs')
        .select('*')
        .eq('tenancy_id', tenancyId)
        .order('created_at', { ascending: false }),
    ]);

    if (tRes.data) {
      const t = tRes.data as unknown as Tenancy;
      setTenancy(t);
      setEditForm(t);
      setPayForm(f => ({ ...f, amount: String(t.rent_amount) }));
    }
    if (pRes.data) setPayments(pRes.data as RentPayment[]);
    if (jRes.data) setJobs(jRes.data as MaintenanceJob[]);
    setLoading(false);
  }, [user, tenancyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Handlers ─── */
  const handleEditSave = async () => {
    if (!tenancyId) return;
    setSaving(true);
    const { error } = await supabase.from('tenancies').update({
      tenant_name: editForm.tenant_name,
      tenant_email: editForm.tenant_email,
      tenant_phone: editForm.tenant_phone,
      lease_start: editForm.lease_start,
      lease_end: editForm.lease_end,
      rent_amount: editForm.rent_amount,
      rent_frequency: editForm.rent_frequency,
      bond_amount: editForm.bond_amount,
      bond_lodgement_number: editForm.bond_lodgement_number,
      bond_authority: editForm.bond_authority,
      management_fee_percent: editForm.management_fee_percent,
      owner_name: editForm.owner_name,
      owner_email: editForm.owner_email,
      owner_bsb: editForm.owner_bsb,
      owner_account_number: editForm.owner_account_number,
      status: editForm.status,
      notes: editForm.notes,
    } as any).eq('id', tenancyId);
    setSaving(false);
    if (error) { toast.error('Error — error.message'); return; }
    toast.success('Tenancy updated');
    setShowEdit(false);
    fetchAll();
  };

  const handleRecordPayment = async () => {
    if (!agentId || !tenancyId || !tenancy) return;
    const receiptNumber = `RP-${Date.now()}`;
    setSaving(true);
    const { error } = await supabase.from('rent_payments').insert({
      tenancy_id: tenancyId,
      agent_id: agentId,
      amount: parseFloat(payForm.amount),
      payment_date: payForm.payment_date,
      period_from: payForm.period_from,
      period_to: payForm.period_to,
      receipt_number: receiptNumber,
      payment_method: payForm.payment_method,
      status: 'paid',
      notes: payForm.notes || null,
    } as any);

    if (!error) {
      // Also insert trust receipt
      const propertyAddr = tenancy.properties
        ? `${tenancy.properties.address}, ${tenancy.properties.suburb}`
        : 'Unknown property';
      await supabase.from('trust_receipts').insert({
        agent_id: agentId,
        receipt_number: `TR-${Date.now()}`,
        client_name: tenancy.tenant_name,
        property_address: propertyAddr,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        purpose: 'rent',
        date_received: payForm.payment_date,
        status: 'received',
      } as any);
    }

    setSaving(false);
    if (error) { toast.error('Error — error.message'); return; }

    // Email receipt to tenant
    if (tenancy.tenant_email) {
      const propertyAddr = tenancy.properties
        ? `${tenancy.properties.address}, ${tenancy.properties.suburb}`
        : 'your property';
      supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: agentId,
          type: 'rent_receipt',
          title: `Rent payment receipt — ${receiptNumber}`,
          message: `Hi ${tenancy.tenant_name}, this confirms your rent payment of $${parseFloat(payForm.amount).toLocaleString()} for ${propertyAddr} received on ${payForm.payment_date}. Receipt number: ${receiptNumber}. Thank you.`,
          recipient_email: tenancy.tenant_email,
          lead_name: tenancy.tenant_name,
        },
      }).catch(() => {});
    }

    toast.success('Payment recorded & trust receipt created');
    setShowRecordPayment(false);
    setPayForm({ payment_date: format(new Date(), 'yyyy-MM-dd'), period_from: '', period_to: '', amount: String(tenancy.rent_amount), payment_method: 'bank_transfer', notes: '' });
    fetchAll();
  };

  const handleMarkOverdue = async (paymentId: string) => {
    await supabase.from('rent_payments').update({ status: 'overdue' } as any).eq('id', paymentId);
    toast.success('Marked as overdue');
    fetchAll();
  };

  const handleNewJob = async () => {
    if (!agentId || !tenancy) return;
    setSaving(true);
    const { error } = await supabase.from('maintenance_jobs').insert({
      tenancy_id: tenancyId,
      property_id: tenancy.property_id,
      agent_id: agentId,
      title: jobForm.title,
      description: jobForm.description || null,
      priority: jobForm.priority,
      assigned_to: jobForm.assigned_to || null,
      estimated_cost: jobForm.estimated_cost ? parseFloat(jobForm.estimated_cost) : null,
    } as any);
    setSaving(false);
    if (error) { toast.error('Error — error.message'); return; }
    toast.success('Maintenance job created');
    setShowNewJob(false);
    setJobForm({ title: '', description: '', priority: 'routine', assigned_to: '', estimated_cost: '' });
    fetchAll();
  };

  const handleMarkComplete = async (jobId: string) => {
    setSaving(true);
    await supabase.from('maintenance_jobs').update({
      status: 'completed',
      actual_cost: jobActualCost ? parseFloat(jobActualCost) : null,
      completed_at: jobCompletedAt ? jobCompletedAt.toISOString() : new Date().toISOString(),
    } as any).eq('id', jobId);
    // Fire automation: tenant completion notice
    supabase.functions.invoke('run-pm-automations', {
      body: { rule_type: 'maintenance_update', maintenance_job_id: jobId, new_status: 'completed' },
    }).catch(() => {});
    setSaving(false);
    toast.success('Job marked complete');
    setExpandedJobId(null);
    fetchAll();
  };

  /* ─── Renewal handlers ─── */
  const openRenewal = () => {
    if (!tenancy) return;
    setRenewalForm({
      rent: String(tenancy.rent_amount),
      lease_end: tenancy.lease_end || '',
      type: 'fixed',
      notes: '',
    });
    setShowRenewal(true);
  };

  const submitRenewalOffer = async () => {
    if (!tenancy || !renewalForm.lease_end) { toast.error('Pick a new lease end date'); return; }
    setSaving(true);
    const { error } = await supabase.from('tenancies').update({
      renewal_status: 'offered',
      renewal_offered_at: new Date().toISOString(),
      renewal_offered_rent: renewalForm.rent ? parseFloat(renewalForm.rent) : null,
      renewal_offered_lease_end: renewalForm.lease_end,
      renewal_type: renewalForm.type,
      renewal_notes: renewalForm.notes || null,
    } as any).eq('id', tenancy.id);
    setSaving(false);
    if (error) { toast.error('Could not record renewal offer'); return; }
    toast.success('Renewal offer recorded');
    setShowRenewal(false);
    fetchAll();
  };

  const acceptRenewal = async () => {
    if (!tenancy) return;
    const updates: any = { renewal_status: 'accepted' };
    if (tenancy.renewal_offered_lease_end) updates.lease_end = tenancy.renewal_offered_lease_end;
    if (tenancy.renewal_offered_rent != null) updates.rent_amount = tenancy.renewal_offered_rent;
    const { error } = await supabase.from('tenancies').update(updates).eq('id', tenancy.id);
    if (error) { toast.error('Could not update'); return; }
    toast.success('Lease renewed');
    fetchAll();
  };

  const declineRenewal = async () => {
    if (!tenancy) return;
    const { error } = await supabase.from('tenancies').update({ renewal_status: 'declined' } as any).eq('id', tenancy.id);
    if (error) { toast.error('Could not update'); return; }
    toast.success('Tenant not renewing — consider listing for re-let');
    fetchAll();
  };

  /* ─── Owner portal email ─── */
  const copyOwnerLink = () => {
    const token = tenancy?.properties?.owner_portal_token;
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/owner/portal?token=${token}`);
    toast.success('Copied!');
  };

  const emailOwnerPortal = async () => {
    const token = tenancy?.properties?.owner_portal_token;
    const ownerEmail = tenancy?.properties?.owner_email;
    const ownerName = tenancy?.properties?.owner_name;
    if (!token || !ownerEmail || !agentId) return;
    setEmailingOwner(true);
    const url = `${window.location.origin}/owner/portal?token=${token}`;
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        agent_id: agentId,
        type: 'owner_portal',
        title: 'Access your ListHQ Owner Portal',
        message: `Hi ${ownerName || 'there'}, use this link to view your property financials, approve maintenance quotes and access owner statements: ${url} — no login required.`,
        recipient_email: ownerEmail,
        lead_name: ownerName || 'Owner',
      },
    });
    setEmailingOwner(false);
    if (error) { toast.error('Could not send email'); return; }
    toast.success(`Portal link emailed to ${ownerEmail}`);
  };

  /* ─── Owner Statement PDF ─── */
  const generateStatement = () => {
    if (!tenancy || !agentInfo) return;
    const periodStart = startOfMonth(new Date(statementYear, statementMonth));
    const periodEnd = endOfMonth(periodStart);
    const periodLabel = format(periodStart, 'MMMM yyyy');

    const paidInPeriod = payments.filter(p =>
      p.status === 'paid' &&
      isWithinInterval(parseISO(p.payment_date), { start: periodStart, end: periodEnd })
    );
    const totalRent = paidInPeriod.reduce((s, p) => s + p.amount, 0);
    const mgmtFee = totalRent * (tenancy.management_fee_percent / 100);

    const completedMaintenance = jobs.filter(j =>
      j.status === 'completed' && j.actual_cost && j.completed_at &&
      isWithinInterval(parseISO(j.completed_at), { start: periodStart, end: periodEnd })
    );
    const maintenanceCost = completedMaintenance.reduce((s, j) => s + (j.actual_cost || 0), 0);
    const netDisbursement = totalRent - mgmtFee - maintenanceCost;
    const propertyAddr = tenancy.properties ? `${tenancy.properties.address}, ${tenancy.properties.suburb}` : '—';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Owner Statement – ${periodLabel}</title>
<style>
  @media print { @page { margin: 20mm; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px; }
  .statement { max-width: 650px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 30px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
  .header .act { font-size: 8px; text-transform: uppercase; letter-spacing: 3px; color: #666; margin-bottom: 6px; }
  .header h1 { font-size: 18px; margin-bottom: 4px; }
  .header .period { font-size: 12px; color: #555; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 15px 0; }
  .info-grid .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .info-grid .value { font-size: 11px; font-weight: 600; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { text-align: left; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ddd; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #eee; font-size: 11px; }
  td.amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
  .total-row td { border-top: 2px solid #1a1a1a; font-weight: bold; font-size: 13px; }
  .net-box { text-align: center; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin: 15px 0; }
  .net-box .amt { font-size: 24px; font-weight: bold; }
  .net-box .sub { font-size: 9px; color: #666; margin-top: 4px; }
  .bank-details { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 12px; margin: 15px 0; }
  .bank-details p { font-size: 10px; margin-bottom: 3px; }
  .bank-details .label { font-size: 9px; color: #888; text-transform: uppercase; }
  .footer { border-top: 1px dashed #ccc; padding-top: 12px; margin-top: 15px; text-align: center; }
  .footer p { font-size: 8px; color: #888; margin-bottom: 3px; }
</style></head><body>
<div class="statement">
  <div class="header">
    <p class="act">Agents Financial Administration Act 2014</p>
    <h1>Owner Rental Statement</h1>
    <p class="period">${periodLabel}</p>
  </div>
  <div class="info-grid">
    <div><p class="label">Owner</p><p class="value">${tenancy.owner_name || '—'}</p></div>
    <div><p class="label">Property</p><p class="value">${propertyAddr}</p></div>
    <div><p class="label">Agency</p><p class="value">${agentInfo.agency || '—'}</p></div>
    <div><p class="label">Agent</p><p class="value">${agentInfo.name}${agentInfo.license_number ? ` (Lic. ${agentInfo.license_number})` : ''}</p></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Opening Balance</td><td class="amount">${AUD.format(0)}</td></tr>
      ${paidInPeriod.map(p => `<tr><td>Rent received – ${format(parseISO(p.payment_date), 'dd MMM yyyy')} (${p.receipt_number})</td><td class="amount">${AUD.format(p.amount)}</td></tr>`).join('')}
      <tr><td>Less: Management fee (${tenancy.management_fee_percent}%)</td><td class="amount" style="color:#c00">-${AUD.format(mgmtFee)}</td></tr>
      ${completedMaintenance.map(j => `<tr><td>Less: Maintenance – ${j.title}</td><td class="amount" style="color:#c00">-${AUD.format(j.actual_cost || 0)}</td></tr>`).join('')}
      <tr class="total-row"><td>Net Amount to Disburse</td><td class="amount">${AUD.format(netDisbursement)}</td></tr>
    </tbody>
  </table>
  <div class="net-box">
    <p style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;">Net Disbursement</p>
    <p class="amt">${AUD.format(netDisbursement)}</p>
    <p class="sub">For period ${format(periodStart, 'dd MMM')} – ${format(periodEnd, 'dd MMM yyyy')}</p>
  </div>
  ${tenancy.owner_bsb || tenancy.owner_account_number ? `
  <div class="bank-details">
    <p><span class="label">Payment to:</span></p>
    <p><strong>${tenancy.owner_name || '—'}</strong></p>
    ${tenancy.owner_bsb ? `<p>BSB: ${tenancy.owner_bsb}</p>` : ''}
    ${tenancy.owner_account_number ? `<p>Account: ${tenancy.owner_account_number}</p>` : ''}
  </div>` : ''}
  <div class="footer">
    ${agentInfo.agency ? `<p><strong>${agentInfo.agency}</strong></p>` : ''}
    <p>This statement forms part of the trust account audit trail</p>
    <p>Retain for minimum 5 years per legislative requirements</p>
    <p>Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=750,height=950');
    if (w) { w.document.write(html); w.document.close(); }
    else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Owner_Statement_${periodLabel.replace(' ', '_')}.html`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ─── Helpers ─── */
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      vacating: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      ended: 'bg-muted text-muted-foreground',
      pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    };
    return <Badge className={cn('border-0', map[status] || '')}>{status}</Badge>;
  };

  const paymentStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      overdue: 'bg-red-500/15 text-red-700 dark:text-red-400',
      reversed: 'bg-muted text-muted-foreground',
    };
    return <Badge className={cn('border-0', map[status] || '')}>{status}</Badge>;
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      urgent: 'bg-red-500/15 text-red-700 dark:text-red-400',
      routine: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      low: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    };
    return <Badge className={cn('border-0', map[p] || '')}>{p}</Badge>;
  };

  const jobStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      assigned: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      quoted: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      in_progress: 'bg-primary/15 text-primary',
      completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return <Badge className={cn('border-0', map[s] || '')}>{s.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!tenancy) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Tenancy not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/rent-roll')}>
          Back to Rent Roll
        </Button>
      </div>
    );
  }

  const today = new Date();
  const propertyAddr = tenancy.properties ? `${tenancy.properties.address}, ${tenancy.properties.suburb}` : '—';

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={tenancy.tenant_name}
        subtitle={propertyAddr}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/rent-roll')}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Rent Payments</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="statement">Owner Statement</TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: Overview ═══ */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Tenancy Details</h3>
                  <Button size="sm" variant="outline" onClick={() => { setEditForm(tenancy); setShowEdit(true); }}>
                    <Edit size={14} className="mr-1" /> Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <Field label="Tenant" value={tenancy.tenant_name} />
                  <Field label="Email" value={tenancy.tenant_email} />
                  <Field label="Phone" value={tenancy.tenant_phone} />
                  <Field label="Status" value={statusBadge(tenancy.status)} />
                  <Field label="Lease Start" value={format(parseISO(tenancy.lease_start), 'dd MMM yyyy')} />
                  <Field label="Lease End" value={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{format(parseISO(tenancy.lease_end), 'dd MMM yyyy')}</span>
                      {(() => {
                        const days = Math.floor((parseISO(tenancy.lease_end).getTime() - Date.now()) / 86400000);
                        const rs = tenancy.renewal_status;
                        if (rs === 'offered') return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-[10px]">Offer Sent</Badge>;
                        if (rs === 'accepted') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">Renewed</Badge>;
                        if (rs === 'declined') return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-0 text-[10px]">Not Renewing</Badge>;
                        if (days < 60) return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-0 text-[10px]">Renewal Urgent</Badge>;
                        if (days <= 90) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px]">Renewal Due Soon</Badge>;
                        return null;
                      })()}
                    </div>
                  } />
                  {(() => {
                    const days = Math.floor((parseISO(tenancy.lease_end).getTime() - Date.now()) / 86400000);
                    const rs = tenancy.renewal_status;
                    const showOffer = (rs === 'none' || !rs || rs === 'declined') && days <= 90;
                    return (
                      <div className="col-span-full flex flex-wrap gap-2">
                        {showOffer && (
                          <Button size="sm" variant="outline" onClick={openRenewal}>
                            <RefreshCw size={12} className="mr-1.5" /> Offer Renewal
                          </Button>
                        )}
                        {rs === 'offered' && (
                          <>
                            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={acceptRenewal}>
                              <CheckCircle2 size={12} className="mr-1.5" /> Mark Accepted
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={declineRenewal}>
                              Mark Declined
                            </Button>
                            {tenancy.renewal_offered_lease_end && (
                              <span className="text-xs text-muted-foreground self-center">
                                Offered: {format(parseISO(tenancy.renewal_offered_lease_end), 'd MMM yyyy')}
                                {tenancy.renewal_offered_rent != null && ` · ${AUD.format(tenancy.renewal_offered_rent)}`}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <Field label="Bond" value={AUD.format(tenancy.bond_amount)} />
                  <Field label="Bond Lodgement #" value={tenancy.bond_lodgement_number} />
                  <Field label="Bond Authority" value={tenancy.bond_authority} />
                  {(!tenancy.bond_lodgement_number || tenancy.bond_lodgement_number.trim() === '' || /^\d{1,4}$/.test(tenancy.bond_lodgement_number.trim())) && tenancy.bond_amount > 0 && (
                    <div className="col-span-full">
                      <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/30 px-3 py-2">
                        <span className="text-sm mt-0.5">⚠️</span>
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                          Bond lodgement reference missing — must be lodged with <strong>{tenancy.bond_authority || 'the relevant bond authority'}</strong> within 10 business days of receipt.
                        </p>
                      </div>
                    </div>
                  )}
                  <Field label="Management Fee" value={`${tenancy.management_fee_percent}%`} />
                  <Field label="Owner" value={tenancy.owner_name} />
                  <Field label="Owner Email" value={tenancy.owner_email} />
                  <Field label="Owner BSB" value={tenancy.owner_bsb} />
                  <Field label="Owner Account" value={tenancy.owner_account_number} />
                  {tenancy.notes && <div className="col-span-full"><Field label="Notes" value={tenancy.notes} /></div>}
                </div>
                <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/statements?property_id=${tenancy.property_id}`)}
                  >
                    <FileText size={14} className="mr-2" /> View Owner Statements
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/trust?property_id=${tenancy.property_id}`)}
                  >
                    <FileText size={14} className="mr-2" /> View Trust Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {agentId && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TenantPortalCard
                  tenancyId={tenancy.id}
                  tenantName={tenancy.tenant_name}
                  tenantEmail={tenancy.tenant_email}
                  portalToken={tenancy.tenant_portal_token}
                  agentId={agentId}
                />
                <OwnerPortalCard propertyId={tenancy.property_id} />
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB 2: Rent Payments ═══ */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowRecordPayment(true)}>
                <Plus size={14} className="mr-1" /> Record Payment
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No payments recorded yet.</TableCell></TableRow>
                      ) : payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{format(parseISO(p.payment_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-xs">{format(parseISO(p.period_from), 'dd MMM')} – {format(parseISO(p.period_to), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right tabular-nums">{AUD.format(p.amount)}</TableCell>
                          <TableCell className="capitalize">{p.payment_method.replace('_', ' ')}</TableCell>
                          <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                          <TableCell>{paymentStatusBadge(p.status)}</TableCell>
                          <TableCell>
                            {p.status === 'pending' && new Date(p.period_to) < today && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleMarkOverdue(p.id)}>
                                <AlertTriangle size={12} className="mr-1" /> Overdue
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 3: Maintenance ═══ */}
          <TabsContent value="maintenance" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowNewJob(true)}>
                <Plus size={14} className="mr-1" /> New Job
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No maintenance jobs.</TableCell></TableRow>
                      ) : jobs.map(j => (
                        <>
                          <TableRow
                            key={j.id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() => {
                              setExpandedJobId(expandedJobId === j.id ? null : j.id);
                              setJobActualCost(j.actual_cost ? String(j.actual_cost) : '');
                              setJobCompletedAt(j.completed_at ? parseISO(j.completed_at) : undefined);
                            }}
                          >
                            <TableCell className="font-medium">{j.title}</TableCell>
                            <TableCell>{priorityBadge(j.priority)}</TableCell>
                            <TableCell>{jobStatusBadge(j.status)}</TableCell>
                            <TableCell>
                              {j.assigned_to || '—'}
                              {j.assigned_phone && (
                                <span className="block text-xs text-muted-foreground tabular-nums">
                                  Supplier phone: {j.assigned_phone}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{j.estimated_cost ? AUD.format(j.estimated_cost) : '—'}</TableCell>
                            <TableCell className="text-xs">{format(parseISO(j.created_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                              {expandedJobId === j.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </TableCell>
                          </TableRow>
                          {expandedJobId === j.id && (
                            <TableRow key={`${j.id}-detail`}>
                              <TableCell colSpan={7} className="bg-accent/30 px-6 py-4">
                                <div className="space-y-3">
                                  {j.description && <p className="text-sm text-muted-foreground">{j.description}</p>}
                                  {j.status !== 'completed' && j.status !== 'cancelled' && (
                                    <div className="flex flex-wrap items-end gap-3">
                                      <div>
                                        <Label className="text-xs">Actual Cost</Label>
                                        <Input type="number" step="0.01" className="w-32 h-8" value={jobActualCost} onChange={e => setJobActualCost(e.target.value)} />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Completed Date</Label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className={cn('w-40 justify-start text-left font-normal h-8', !jobCompletedAt && 'text-muted-foreground')}>
                                              {jobCompletedAt ? format(jobCompletedAt, 'dd MMM yyyy') : 'Pick date'}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={jobCompletedAt} onSelect={setJobCompletedAt} initialFocus className="p-3 pointer-events-auto" />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                      <Button size="sm" className="h-8" disabled={saving} onClick={() => handleMarkComplete(j.id)}>
                                        <CheckCircle2 size={14} className="mr-1" /> Mark Complete
                                      </Button>
                                    </div>
                                  )}
                                  {j.status === 'completed' && (
                                    <p className="text-xs text-muted-foreground">
                                      Completed {j.completed_at ? format(parseISO(j.completed_at), 'dd MMM yyyy') : '—'}
                                      {j.actual_cost ? ` • Actual cost: ${AUD.format(j.actual_cost)}` : ''}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 4: Owner Statement ═══ */}
          <TabsContent value="statement" className="mt-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Generate Owner Statement</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs">Month</Label>
                    <Select value={String(statementMonth)} onValueChange={v => setStatementMonth(Number(v))}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>{format(new Date(2024, i), 'MMMM')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Year</Label>
                    <Select value={String(statementYear)} onValueChange={v => setStatementYear(Number(v))}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={generateStatement}>
                    <Printer size={14} className="mr-1" /> Generate Statement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ═══ Edit Dialog ═══ */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Tenancy</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tenant Name</Label><Input value={editForm.tenant_name || ''} onChange={e => setEditForm(f => ({ ...f, tenant_name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={editForm.tenant_email || ''} onChange={e => setEditForm(f => ({ ...f, tenant_email: e.target.value }))} /></div>
            </div>
            <div><Label>Phone</Label><Input value={editForm.tenant_phone || ''} onChange={e => setEditForm(f => ({ ...f, tenant_phone: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lease Start</Label><Input type="date" value={editForm.lease_start || ''} onChange={e => setEditForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
              <div><Label>Lease End</Label><Input type="date" value={editForm.lease_end || ''} onChange={e => setEditForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Rent Amount</Label><Input type="number" step="0.01" value={editForm.rent_amount || ''} onChange={e => setEditForm(f => ({ ...f, rent_amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div>
                <Label>Frequency</Label>
                <Select value={editForm.rent_frequency || 'weekly'} onValueChange={v => setEditForm(f => ({ ...f, rent_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Bond</Label><Input type="number" step="0.01" value={editForm.bond_amount || ''} onChange={e => setEditForm(f => ({ ...f, bond_amount: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bond Lodgement #</Label><Input value={editForm.bond_lodgement_number || ''} onChange={e => setEditForm(f => ({ ...f, bond_lodgement_number: e.target.value }))} /></div>
              <div><Label>Bond Authority</Label><Input value={editForm.bond_authority || ''} onChange={e => setEditForm(f => ({ ...f, bond_authority: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Management Fee %</Label>
              <Input type="number" step="0.01" value={editForm.management_fee_percent || ''} onChange={e => setEditForm(f => ({ ...f, management_fee_percent: parseFloat(e.target.value) || 0 }))} />
              {(() => {
                const v = editForm.management_fee_percent;
                if (v <= 0) return <p className="text-xs text-destructive mt-1">Management fee cannot be zero or negative.</p>;
                if (v < 5) return <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Below typical AU range (5–15%). Confirm with landlord.</p>;
                if (v > 15) return <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Above typical AU range. Confirm this is correct.</p>;
                return null;
              })()}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status || 'active'} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vacating">Vacating</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-3">Owner Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editForm.owner_name || ''} onChange={e => setEditForm(f => ({ ...f, owner_name: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={editForm.owner_email || ''} onChange={e => setEditForm(f => ({ ...f, owner_email: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><Label>BSB</Label><Input value={editForm.owner_bsb || ''} onChange={e => setEditForm(f => ({ ...f, owner_bsb: e.target.value }))} /></div>
                <div><Label>Account #</Label><Input value={editForm.owner_account_number || ''} onChange={e => setEditForm(f => ({ ...f, owner_account_number: e.target.value }))} /></div>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleEditSave} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Record Payment Dialog ═══ */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Rent Payment</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Payment Date</Label><Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period From</Label><Input type="date" value={payForm.period_from} onChange={e => setPayForm(f => ({ ...f, period_from: e.target.value }))} /></div>
              <div><Label>Period To</Label><Input type="date" value={payForm.period_to} onChange={e => setPayForm(f => ({ ...f, period_to: e.target.value }))} /></div>
            </div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bpay">BPAY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleRecordPayment} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ New Maintenance Job Dialog ═══ */}
      <Dialog open={showNewJob} onOpenChange={setShowNewJob}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Maintenance Job</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Title</Label><Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={jobForm.priority} onValueChange={v => setJobForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Assigned To</Label><Input value={jobForm.assigned_to} onChange={e => setJobForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            <div><Label>Estimated Cost</Label><Input type="number" step="0.01" value={jobForm.estimated_cost} onChange={e => setJobForm(f => ({ ...f, estimated_cost: e.target.value }))} /></div>
            <Button onClick={handleNewJob} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}Create Job</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Renewal Offer Dialog ═══ */}
      <Dialog open={showRenewal} onOpenChange={setShowRenewal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Offer lease renewal</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>New weekly rent</Label><Input type="number" step="0.01" value={renewalForm.rent} onChange={e => setRenewalForm(f => ({ ...f, rent: e.target.value }))} /></div>
            <div><Label>New lease end date</Label><Input type="date" value={renewalForm.lease_end} onChange={e => setRenewalForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
            <div>
              <Label>Renewal type</Label>
              <Select value={renewalForm.type} onValueChange={v => setRenewalForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed term</SelectItem>
                  <SelectItem value="periodic">Periodic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={renewalForm.notes} onChange={e => setRenewalForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={submitRenewalOffer} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}Send renewal offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Field helper ─── */
const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{typeof value === 'string' ? (value || '—') : value}</p>
  </div>
);

export default TenancyDetailPage;
