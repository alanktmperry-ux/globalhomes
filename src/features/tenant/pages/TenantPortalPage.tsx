import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Home, Phone, Mail, Calendar, DollarSign, FileText,
  Wrench, AlertCircle, CheckCircle2, Plus, Download, Clock,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface PortalData {
  tenancy:
    | {
        id: string;
        start_date: string;
        end_date?: string;
        rent_amount: number;
        status: string;
        lease_start?: string;
        lease_end?: string;
        rent_frequency?: string;
        bond_amount?: number;
        bond_lodgement_number?: string;
        bond_authority?: string;
        tenant_name?: string;
      }
    | null;
  property:
    | { id: string; address: string; suburb: string; state: string; image_url?: string; postcode?: string }
    | null;
  agent:
    | { id: string; name: string; email?: string; phone?: string; avatar_url?: string; profile_photo_url?: string }
    | null;
  documents: { id: string; name: string; url: string; created_at: string; label?: string; document_type?: string; uploaded_at?: string; file_url?: string }[];
  maintenance: { id: string; title: string; status: string; created_at: string; priority?: string }[];
  payments: { id: string; amount: number; paid_at: string; status: string; payment_date?: string; payment_method?: string }[];
  inspections: { id: string; scheduled_at: string; type: string; status: string; scheduled_date?: string; inspection_type?: string; report_token?: string }[];
}

const TenantPortalPage = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Maintenance form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', priority: 'routine',
  });

  const load = useCallback(async () => {
    if (!token) { setError('No portal token provided'); setLoading(false); return; }
    setLoading(true);
    const { data: result, error: err } = await supabase.rpc('get_tenancy_by_portal_token', { p_token: token } as any);
    if (err || !result || (result as any).error) {
      setError('Invalid or expired link — please contact your property manager');
      setLoading(false);
      return;
    }
    setData(result as unknown as PortalData);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Audit log: portal access (fire-and-forget)
  useEffect(() => {
    const tenancyId = data?.tenancy?.id;
    if (!tenancyId) return;
    supabase.from('audit_logs').insert({
      event_type: 'portal_access',
      portal_type: 'tenant',
      entity_id: tenancyId,
      accessed_at: new Date().toISOString(),
    } as any).then(() => {/* fire-and-forget */}, () => {/* ignore */});
  }, [data?.tenancy?.id]);

  const submitMaintenance = async () => {
    if (!form.title.trim()) { toast.error('Please enter a title'); return; }
    setSubmitting(true);
    try {
      const { data: result, error: err } = await supabase.rpc('submit_tenant_maintenance', {
        p_token: token!,
        p_title: form.title,
        p_description: form.description,
        p_category: form.category,
        p_priority: form.priority,
      } as any);
      if (err || (result as any)?.error) {
        toast.error('Could not submit request — please try again');
        return;
      }
      toast.success('Maintenance request submitted ✓');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'general', priority: 'routine' });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto text-destructive" size={36} />
            <h1 className="text-lg font-semibold">Unable to load portal</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenancy, property, agent, documents, maintenance, payments, inspections } = data;
  const propAddr = property ? `${property.address}, ${property.suburb} ${property.state ?? ''} ${property.postcode ?? ''}`.trim() : '—';
  const daysToEnd = tenancy.lease_end ? differenceInDays(parseISO(tenancy.lease_end), new Date()) : null;
  const leaseColor = daysToEnd === null ? 'bg-muted text-muted-foreground'
    : daysToEnd > 90 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    : daysToEnd > 60 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
    : 'bg-red-500/15 text-red-700 dark:text-red-400';

  // Rent status — derive from latest payment + frequency (simple heuristic)
  const lastPaid = payments.find(p => p.status === 'paid');
  const overduePayment = payments.find(p => p.status === 'overdue');
  const isOverdue = !!overduePayment;

  const upcomingInspection = inspections.find(i => i.scheduled_date && parseISO(i.scheduled_date) > new Date());
  const pastInspections = inspections.filter(i => i.scheduled_date && parseISO(i.scheduled_date) <= new Date());

  const docTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      lease: 'Lease', inspection_report: 'Inspection', entry_notice: 'Entry Notice',
      rent_receipt: 'Receipt', other: 'Document',
    };
    return map[t] || t;
  };

  const statusBadgeClass = (s: string) => {
    const map: Record<string, string> = {
      new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      acknowledged: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
      assigned: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
      in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      cancelled: 'bg-muted text-muted-foreground',
      paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      overdue: 'bg-red-500/15 text-red-700 dark:text-red-400',
      pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    };
    return map[s] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Helmet>
        <title>My Tenancy Portal — ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold tracking-tight">ListHQ</div>
            <Badge variant="secondary" className="text-xs">Tenant Portal</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold">My Tenancy Portal</h1>
          {tenancy.tenant_name && (
            <p className="text-sm text-muted-foreground mt-1">Welcome, {tenancy.tenant_name}</p>
          )}
          <p className="text-base sm:text-lg font-medium mt-3">{propAddr}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Agent contact */}
        {agent && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your Property Manager</h2>
              <div className="flex items-start gap-4">
                {(agent.profile_photo_url || agent.avatar_url) && (
                  <img
                    src={agent.profile_photo_url || agent.avatar_url}
                    alt="Property photo"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{agent.name}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agent.phone && (
                      <a href={`tel:${agent.phone}`}>
                        <Button size="sm" variant="outline" className="h-9">
                          <Phone size={14} className="mr-1.5" /> {agent.phone}
                        </Button>
                      </a>
                    )}
                    {agent.email && (
                      <a href={`mailto:${agent.email}`}>
                        <Button size="sm" variant="outline" className="h-9">
                          <Mail size={14} className="mr-1.5" /> Email
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Lease Summary */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Home size={14} /> Lease Summary
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Lease Start" value={tenancy.lease_start ? format(parseISO(tenancy.lease_start), 'dd MMM yyyy') : '—'} />
                <Stat label="Lease End" value={tenancy.lease_end ? format(parseISO(tenancy.lease_end), 'dd MMM yyyy') : '—'} />
                <Stat label="Rent" value={`${AUD.format(tenancy.rent_amount || 0)} / ${tenancy.rent_frequency || 'week'}`} />
                <Stat label="Bond" value={AUD.format(tenancy.bond_amount || 0)} />
                {tenancy.bond_lodgement_number && (
                  <Stat label="Bond Reference" value={tenancy.bond_lodgement_number} />
                )}
                {tenancy.bond_authority && (
                  <Stat label="Bond Authority" value={tenancy.bond_authority} />
                )}
              </div>
              {daysToEnd !== null && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${leaseColor}`}>
                  <Calendar size={14} />
                  {daysToEnd > 0 ? `${daysToEnd} days until lease end` : daysToEnd === 0 ? 'Lease ends today' : `Lease ended ${Math.abs(daysToEnd)} days ago`}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 2: Rent & Payments */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <DollarSign size={14} /> Rent & Payments
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className={`px-4 py-3 rounded-lg flex items-center justify-between ${isOverdue ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <div className="flex items-center gap-2">
                  {isOverdue ? <AlertCircle className="text-red-600" size={18} /> : <CheckCircle2 className="text-emerald-600" size={18} />}
                  <div>
                    <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {isOverdue ? 'Rent overdue' : 'Rent up to date'}
                    </p>
                    {lastPaid && !isOverdue && lastPaid.payment_date && (
                      <p className="text-xs text-muted-foreground">Last payment {format(parseISO(lastPaid.payment_date), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>

              {payments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Payments</p>
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{AUD.format(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.payment_date ? format(parseISO(p.payment_date), 'dd MMM yyyy') : '—'}
                          {p.payment_method && ` • ${p.payment_method.replace('_', ' ')}`}
                        </p>
                      </div>
                      <Badge className={`border-0 ${statusBadgeClass(p.status)}`}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No payment history yet</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Maintenance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Wrench size={14} /> Maintenance Requests
            </h2>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus size={14} className="mr-1" /> New Request
              </Button>
            )}
          </div>

          {showForm && (
            <Card className="mb-3">
              <CardContent className="p-5 space-y-3">
                <div>
                  <Label className="text-xs">Title *</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Leaking kitchen tap"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="appliance">Appliance</SelectItem>
                        <SelectItem value="heating_cooling">Heating / Cooling</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="pest">Pest control</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the issue..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={submitMaintenance} disabled={submitting}>
                    {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              {maintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No maintenance requests yet</p>
              ) : (
                <div className="space-y-3">
                  {maintenance.map(m => (
                    <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(m.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`border-0 text-xs ${statusBadgeClass(m.status)}`}>{m.status?.replace('_', ' ')}</Badge>
                        {m.priority === 'urgent' && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Documents */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <FileText size={14} /> Documents
          </h2>
          <Card>
            <CardContent className="p-5">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet — contact your property manager
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.label || docTypeLabel(d.document_type)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{docTypeLabel(d.document_type)}</Badge>
                          <span className="text-xs text-muted-foreground">{d.uploaded_at ? format(parseISO(d.uploaded_at), 'dd MMM yyyy') : '—'}</span>
                        </div>
                      </div>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-9">
                          <Download size={14} className="mr-1" /> Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 5: Inspections */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Clock size={14} /> Inspections
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              {upcomingInspection ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary mb-1">Next Scheduled Inspection</p>
                  <p className="text-base font-semibold">
                    {upcomingInspection.scheduled_date ? format(parseISO(upcomingInspection.scheduled_date), 'EEEE dd MMM yyyy') : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize mt-1">{upcomingInspection.inspection_type} inspection</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Your property manager is required to provide advance written notice before any property entry in accordance with the tenancy laws in your state or territory.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No upcoming inspections scheduled</p>
              )}

              {pastInspections.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Past Inspections</p>
                  <div className="space-y-2">
                    {pastInspections.slice(0, 5).map(i => (
                      <div key={i.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm capitalize">{i.inspection_type}</p>
                          <p className="text-xs text-muted-foreground">{i.scheduled_date ? format(parseISO(i.scheduled_date), 'dd MMM yyyy') : '—'}</p>
                        </div>
                        {i.report_token && (
                          <a href={`/inspection-report/${i.report_token}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">View Report</Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 space-y-1">
          {agent && (
            <p className="text-sm text-muted-foreground">
              Need help? Contact <span className="font-medium text-foreground">{agent.name}</span>
              {agent.phone && <> on <a href={`tel:${agent.phone}`} className="text-primary hover:underline">{agent.phone}</a></>}
              {agent.email && <> or <a href={`mailto:${agent.email}`} className="text-primary hover:underline">email</a></>}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Powered by ListHQ</p>
          <p className="text-xs text-muted-foreground mt-1">Your information is handled in accordance with the <a href="https://listhq.com.au/privacy" className="underline hover:text-foreground">ListHQ Privacy Policy</a>.</p>
        </footer>
      </main>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value}</p>
  </div>
);

export default TenantPortalPage;
