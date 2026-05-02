import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Phone, Mail, Calendar, FileText, Wrench, AlertCircle,
  CheckCircle2, Download, Home, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface PortalData {
  property: any;
  agent: any;
  tenancy: any | null;
  maintenance: any[];
  statements: any[];
  inspections: any[];
  documents: any[];
}

const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || '—';

export default function OwnerPortalPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStatements, setShowAllStatements] = useState(false);
  const [declineReasonForId, setDeclineReasonForId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState<number>(500);
  const [thresholdInput, setThresholdInput] = useState<string>('500');
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [autoApprovedIds, setAutoApprovedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) { setError('No portal token provided'); setLoading(false); return; }
    setLoading(true);
    const { data: result, error: err } = await supabase.rpc('get_property_by_owner_token', { p_token: token } as any);
    if (err || !result || (result as any).error) {
      const code = (result as any)?.error;
      if (code === 'expired') {
        setError('expired');
      } else {
        setError('Invalid or expired link — please contact your property manager');
      }
      setLoading(false);
      return;
    }
    setData(result as unknown as PortalData);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Load owner portal preference (threshold) once we have a property
  useEffect(() => {
    const propertyId = data?.property?.id;
    if (!propertyId) return;
    (async () => {
      const { data: pref } = await supabase
        .from('owner_portal_preferences')
        .select('auto_approve_threshold_aud')
        .eq('property_id', propertyId)
        .maybeSingle();
      const t = pref?.auto_approve_threshold_aud != null ? Number(pref.auto_approve_threshold_aud) : 500;
      setAutoApproveThreshold(t);
      setThresholdInput(String(t));
    })();
  }, [data?.property?.id]);

  // Audit log: portal access (fire-and-forget)
  useEffect(() => {
    const propertyId = data?.property?.id;
    if (!propertyId) return;
    supabase.from('audit_logs').insert({
      event_type: 'portal_access',
      portal_type: 'owner',
      entity_id: propertyId,
      accessed_at: new Date().toISOString(),
    } as any).then(() => {/* fire-and-forget */}, () => {/* ignore */});
  }, [data?.property?.id]);

  // Auto-approve maintenance jobs below the threshold
  useEffect(() => {
    if (!data || !token) return;
    const pending = (data.maintenance || []).filter((m: any) =>
      m.owner_approval_status === 'pending' &&
      Number(m.quoted_amount_aud || 0) > 0 &&
      Number(m.quoted_amount_aud) < autoApproveThreshold &&
      !autoApprovedIds.has(m.id)
    );
    if (pending.length === 0) return;
    pending.forEach((j: any) => {
      setAutoApprovedIds(prev => new Set(prev).add(j.id));
      supabase.rpc('owner_decision_on_maintenance', {
        p_token: token,
        p_job_id: j.id,
        p_decision: 'approved',
        p_decline_reason: `Auto-approved (under $${autoApproveThreshold} threshold)`,
      } as any).then(() => load(), () => {/* ignore */});
    });
  }, [data, autoApproveThreshold, token, autoApprovedIds, load]);

  const saveThreshold = async () => {
    const n = Number(thresholdInput);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const propertyId = data?.property?.id;
    const agentId = data?.agent?.id;
    if (!propertyId || !agentId) return;
    setSavingThreshold(true);
    const { error: err } = await supabase
      .from('owner_portal_preferences')
      .upsert({
        property_id: propertyId,
        agent_id: agentId,
        auto_approve_threshold_aud: n,
      } as any, { onConflict: 'property_id' });
    setSavingThreshold(false);
    if (err) {
      toast.error('Could not save threshold');
      return;
    }
    setAutoApproveThreshold(n);
    toast.success('Auto-approve threshold updated');
  };

  const decide = async (jobId: string, decision: 'approved' | 'declined', reason?: string) => {
    setActing(jobId);
    const { data: res, error: err } = await supabase.rpc('owner_decision_on_maintenance', {
      p_token: token!, p_job_id: jobId, p_decision: decision, p_decline_reason: reason ?? null,
    } as any);
    setActing(null);
    if (err || (res as any)?.error) {
      toast.error('Could not record your decision — please try again');
      return;
    }
    // Notify agent (best-effort)
    if (data?.agent?.email) {
      const job = data.maintenance.find((m: any) => m.id === jobId);
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: data.agent.email,
            subject: `Owner ${decision === 'approved' ? 'approved' : 'declined'}: ${job?.title || 'maintenance request'}`,
            html: `<p>The owner of <strong>${data.property.address}</strong> has <strong>${decision}</strong> the maintenance request "${job?.title}" (quote ${AUD.format(job?.quoted_amount_aud || 0)}).</p>${reason ? `<p>Reason: ${reason}</p>` : ''}`,
          },
        });
      } catch {/* ignore */}
    }
    toast.success(decision === 'approved' ? 'Approved — your property manager will proceed' : 'Declined — your property manager has been notified');
    setDeclineReasonForId(null);
    setDeclineReason('');
    load();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }
  if (error || !data) {
    const isExpired = error === 'expired';
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h1 className="text-lg font-semibold mb-1">
              {isExpired ? 'This link has expired' : 'Portal unavailable'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? 'Your access link has expired. Please contact your property manager to receive a new link.'
                : error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { property, agent, tenancy, maintenance, statements, inspections, documents } = data;
  const pendingApprovals = (maintenance || []).filter((m: any) => m.owner_approval_status === 'pending');
  const otherJobs = (maintenance || []).filter((m: any) => m.owner_approval_status !== 'pending');

  // Lease end days
  let leaseDays: number | null = null;
  let leaseColor = 'bg-muted text-muted-foreground';
  if (tenancy?.lease_end) {
    leaseDays = differenceInDays(parseISO(tenancy.lease_end), new Date());
    leaseColor = leaseDays > 90 ? 'bg-emerald-500/10 text-emerald-700' : leaseDays > 60 ? 'bg-amber-500/10 text-amber-700' : 'bg-destructive/10 text-destructive';
  }

  // Yield calc (annual rent assuming weekly)
  let yieldPct: string | null = null;
  if (tenancy?.rent_amount && property?.price) {
    const priceNum = Number(property.price);
    if (priceNum > 0) {
      const annual = Number(tenancy.rent_amount) * (tenancy.rent_frequency === 'weekly' ? 52 : tenancy.rent_frequency === 'fortnightly' ? 26 : 12);
      yieldPct = ((annual / priceNum) * 100).toFixed(2);
    }
  }

  // 12-month totals
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const last12 = (statements || []).filter((s: any) => parseISO(s.period_end) >= oneYearAgo);
  const totals = last12.reduce((acc: any, s: any) => ({
    gross: acc.gross + Number(s.gross_rent_aud || 0),
    fee: acc.fee + Number(s.management_fee_aud || 0),
    maint: acc.maint + Number(s.maintenance_costs_aud || 0),
    net: acc.net + Number(s.net_amount_aud || 0),
  }), { gross: 0, fee: 0, maint: 0, net: 0 });

  const visibleStatements = showAllStatements ? statements : statements.slice(0, 3);

  const vacancy = !tenancy ? { label: 'Vacant', color: 'bg-amber-500/10 text-amber-700' }
    : tenancy.status === 'vacating' ? { label: 'Vacating', color: 'bg-amber-500/10 text-amber-700' }
    : { label: 'Occupied', color: 'bg-emerald-500/10 text-emerald-700' };

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>Owner Portal · {property.address}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-base">ListHQ</span>
              <span className="text-xs text-muted-foreground">Owner Portal</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold leading-tight">{property.address}</h1>
          <p className="text-sm text-muted-foreground">{property.suburb}, {property.state} {property.postcode}</p>
          {agent && (
            <Card className="mt-4">
              <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{agent.name}</span>
                {agent.phone && <a href={`tel:${agent.phone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone size={14} /> {agent.phone}</a>}
                {agent.email && <a href={`mailto:${agent.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail size={14} /> {agent.email}</a>}
              </CardContent>
            </Card>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* Section 1: Overview */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Property overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Rent</p>
              <p className="text-xl font-semibold mt-1">{tenancy ? `${AUD.format(Number(tenancy.rent_amount))} / ${tenancy.rent_frequency || 'week'}` : '—'}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Lease ends</p>
              <p className="text-sm font-semibold mt-1">{tenancy?.lease_end ? format(parseISO(tenancy.lease_end), 'd MMM yyyy') : '—'}</p>
              {leaseDays !== null && <Badge className={`${leaseColor} text-[10px] mt-1`}>{leaseDays > 0 ? `${leaseDays} days` : 'Expired'}</Badge>}
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Gross yield</p>
              <p className="text-xl font-semibold mt-1">{yieldPct ? `${yieldPct}%` : '—'}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vacancy</p>
              <Badge className={`${vacancy.color} text-xs mt-1`}>{vacancy.label}</Badge>
            </CardContent></Card>
          </div>

          {tenancy && (
            <Card className="mt-3">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tenant</p>
                  <p className="font-medium">{firstName(tenancy.tenant_name)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lease</p>
                  <p>{tenancy.lease_start ? format(parseISO(tenancy.lease_start), 'd MMM yyyy') : '—'} → {tenancy.lease_end ? format(parseISO(tenancy.lease_end), 'd MMM yyyy') : 'Periodic'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment status</p>
                  {tenancy.payment_status === 'overdue'
                    ? <Badge className="bg-destructive/10 text-destructive">{tenancy.days_overdue} days overdue</Badge>
                    : <Badge className="bg-emerald-500/10 text-emerald-700">Up to date</Badge>}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 2: Financial */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Financial summary</h2>
          {statements.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No statements yet — your property manager will publish your first statement after the next rent collection cycle.</CardContent></Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                {visibleStatements.map((s: any) => (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{format(parseISO(s.period_start), 'MMM yyyy')}</p>
                      <p className="text-2xl font-semibold mt-1">{AUD.format(Number(s.net_amount_aud))}</p>
                      <p className="text-[11px] text-muted-foreground">Net to owner</p>
                      <div className="text-xs space-y-0.5 mt-3 text-muted-foreground">
                        <div className="flex justify-between"><span>Gross rent</span><span>{AUD.format(Number(s.gross_rent_aud))}</span></div>
                        <div className="flex justify-between"><span>Deductions</span><span>−{AUD.format(Number(s.management_fee_aud) + Number(s.maintenance_costs_aud) + Number(s.other_deductions_aud))}</span></div>
                      </div>
                      {s.pdf_url && (
                        <Button asChild size="sm" variant="outline" className="w-full mt-3">
                          <a href={s.pdf_url} target="_blank" rel="noreferrer"><Download size={12} className="mr-1" />PDF</a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {statements.length > 3 && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAllStatements(!showAllStatements)}>
                  {showAllStatements ? <>Show less <ChevronUp size={14} className="ml-1" /></> : <>View all statements <ChevronDown size={14} className="ml-1" /></>}
                </Button>
              )}
              <Card className="mt-3 bg-muted/40">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp size={12} /> Last 12 months</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Gross rent</p><p className="font-semibold">{AUD.format(totals.gross)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Mgmt fees</p><p className="font-semibold">{AUD.format(totals.fee)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Maintenance</p><p className="font-semibold">{AUD.format(totals.maint)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Net to you</p><p className="font-semibold text-emerald-700">{AUD.format(totals.net)}</p></div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {/* Section 3: Maintenance & approvals */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Maintenance & approvals</h2>

          {/* Portal preferences — auto-approve threshold */}
          <Card className="mb-4 bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Portal preferences</p>
              <p className="text-xs text-muted-foreground mb-3">
                Auto-approve maintenance jobs under{' '}
                <span className="font-semibold text-foreground">{AUD.format(autoApproveThreshold)}</span>.
                Quotes above this amount require your manual approval.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px] max-w-[200px]">
                  <label className="text-[11px] text-muted-foreground">Threshold (AUD)</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                <Button size="sm" onClick={saveThreshold} disabled={savingThreshold || thresholdInput === String(autoApproveThreshold)}>
                  {savingThreshold ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {pendingApprovals.length > 0 && (
            <div className="space-y-3 mb-4">
              {pendingApprovals.map((j: any) => (
                <Card key={j.id} className="border-amber-500/40 bg-amber-50/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <Badge className="bg-amber-500/10 text-amber-700 mb-1.5">Approval needed</Badge>
                        <p className="font-semibold">{j.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{j.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Quote</p>
                        <p className="text-2xl font-semibold">{AUD.format(Number(j.quoted_amount_aud || 0))}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline" className="text-[10px]">{j.priority}</Badge>
                      {j.quote_document_url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={j.quote_document_url} target="_blank" rel="noreferrer"><Download size={12} className="mr-1" />Quote document</a>
                        </Button>
                      )}
                    </div>

                    {declineReasonForId === j.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for declining (optional)" rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => decide(j.id, 'declined', declineReason)} disabled={acting === j.id}>
                            {acting === j.id ? <Loader2 size={12} className="animate-spin mr-1" /> : null}Confirm decline
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDeclineReasonForId(null); setDeclineReason(''); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(j.id, 'approved')} disabled={acting === j.id}>
                          {acting === j.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeclineReasonForId(j.id)}>Decline</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {otherJobs.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No maintenance jobs.</p>
              ) : (
                <div className="divide-y">
                  {otherJobs.map((j: any) => (
                    <div key={j.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(j.created_at), 'd MMM yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{j.priority}</Badge>
                        <StatusBadge status={j.status} />
                        {j.cost_aud && <span className="text-xs font-medium">{AUD.format(Number(j.cost_aud))}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Inspections */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Inspections</h2>
          <Card>
            <CardContent className="p-4 space-y-2">
              {inspections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inspections recorded.</p>
              ) : inspections.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{i.inspection_type} inspection</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={11} /> {i.scheduled_date ? format(parseISO(i.scheduled_date), 'd MMM yyyy') : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{i.status}</Badge>
                    {i.report_token && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`/inspection-report/${i.report_token}`} target="_blank" rel="noreferrer">View report</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Section 5: Documents */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Documents</h2>
          <Card>
            <CardContent className="p-4">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet — contact your property manager.</p>
              ) : (
                <div className="divide-y">
                  {documents.map((d: any) => (
                    <div key={d.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.label || d.document_type}</p>
                          <p className="text-xs text-muted-foreground">{d.document_type} · {format(parseISO(d.uploaded_at), 'd MMM yyyy')}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <a href={d.file_url} target="_blank" rel="noreferrer"><Download size={12} className="mr-1" />Download</a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="pt-6 pb-10 text-center text-xs text-muted-foreground">
          Need help? Contact {agent?.name} {agent?.phone && <>on <a href={`tel:${agent.phone}`} className="text-primary">{agent.phone}</a></>} {agent?.email && <>or <a href={`mailto:${agent.email}`} className="text-primary">{agent.email}</a></>}
          <p className="mt-2">ListHQ · Owner Portal</p>
          <p className="text-xs text-muted-foreground mt-1">Your information is handled in accordance with the <a href="https://listhq.com.au/privacy" className="underline hover:text-foreground">ListHQ Privacy Policy</a>.</p>
        </footer>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-700',
    acknowledged: 'bg-purple-500/10 text-purple-700',
    in_progress: 'bg-amber-500/10 text-amber-700',
    completed: 'bg-emerald-500/10 text-emerald-700',
    cancelled: 'bg-muted text-muted-foreground',
    assigned: 'bg-blue-500/10 text-blue-700',
    quoted: 'bg-purple-500/10 text-purple-700',
  };
  return <Badge className={`${map[status] || 'bg-muted text-muted-foreground'} text-[10px] capitalize`}>{status?.replace(/_/g, ' ')}</Badge>;
}
