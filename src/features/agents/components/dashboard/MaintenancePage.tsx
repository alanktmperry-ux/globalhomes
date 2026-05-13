import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wrench, Loader2, Copy, ChevronDown, ChevronUp, CheckCircle2, Upload, Receipt, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';
import { useTranslation } from '@/shared/lib/i18n';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

interface Job {
  id: string;
  property_id: string;
  tenancy_id: string | null;
  tenant_portal_token?: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  assigned_to: string | null;
  assigned_supplier_id: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  completed_at: string | null;
  property_address?: string | null;
  tenant_name?: string | null;
  tenant_email?: string | null;
  supplier_name?: string | null;
  scheduled_entry_date: string | null;
  entry_notice_sent_at: string | null;
  photo_urls: string[];
  invoice_url: string | null;
  auto_approved?: boolean;
}

interface Supplier { id: string; business_name: string; trade_category: string; email: string | null; }

const STATUSES = ['all', 'new', 'acknowledged', 'assigned', 'in_progress', 'completed', 'cancelled'];

import { APlusBadge, type APlusBadgeTone } from '@/components/ui/data-table-aplus';

const STATUS_TONE: Record<string, APlusBadgeTone> = {
  new: 'blue',
  acknowledged: 'amber',
  assigned: 'amber',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'grey',
  quoted: 'cyan',
};
const statusBadge = (s: string) => (
  <APlusBadge tone={STATUS_TONE[s] || 'grey'} label={s.replace('_', ' ')} />
);

const PRIORITY_TONE: Record<string, APlusBadgeTone> = {
  urgent: 'red',
  low: 'blue',
  standard: 'amber',
  cosmetic: 'grey',
};
const priorityBadge = (p: string) => (
  <APlusBadge tone={PRIORITY_TONE[p] || 'amber'} label={p} icon={p === 'urgent' ? 'solar:danger-triangle-linear' : undefined} />
);

export default function MaintenancePage() {
  const { t } = useTranslation();
  const agentId = useAgentId();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const uploadJobPhotos = async (job: Job, files: FileList | null) => {
    if (!files || files.length === 0 || !agentId) return;
    setUploadingFor(job.id);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${agentId}/${job.id}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('maintenance-photos')
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from('maintenance-photos')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) newUrls.push(signed.signedUrl);
      }
      const merged = [...(job.photo_urls || []), ...newUrls];
      const { error: updErr } = await supabase
        .from('maintenance_jobs')
        .update({ photo_urls: merged } as any)
        .eq('id', job.id);
      if (updErr) throw updErr;
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, photo_urls: merged } : j));
      toast.success('Photos uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingFor(null);
    }
  };

  // assign dialog
  const [assignFor, setAssignFor] = useState<Job | null>(null);
  const [assignSupplierId, setAssignSupplierId] = useState<string>('');

  // quote dialog
  const [quoteFor, setQuoteFor] = useState<Job | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');

  const [entryFor, setEntryFor] = useState<Job | null>(null);
  const [entryDate, setEntryDate] = useState('');
  const [entrySaving, setEntrySaving] = useState(false);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const [{ data: js }, { data: sups }] = await Promise.all([
      supabase
        .from('maintenance_jobs')
        .select('*, properties:property_id(address, suburb), tenancies:tenancy_id(tenant_name, tenant_email, tenant_portal_token), supplier:assigned_supplier_id(business_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false }),
      supabase.from('suppliers' as any).select('id, business_name, trade_category, email').eq('agent_id', agentId).eq('status', 'active'),
    ]);
    const list: Job[] = (js || []).map((j: any) => ({
      ...j,
      photo_urls: Array.isArray(j.photo_urls) ? j.photo_urls : [],
      property_address: j.properties ? `${j.properties.address}, ${j.properties.suburb}` : null,
      tenant_name: j.tenancies?.tenant_name || null,
      tenant_email: j.tenancies?.tenant_email || null,
      tenant_portal_token: j.tenancies?.tenant_portal_token || null,
      supplier_name: j.supplier?.business_name || null,
    }));
    setJobs(list);
    setSuppliers((sups as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const filtered = useMemo(() => jobs.filter(j => statusFilter === 'all' || j.status === statusFilter), [jobs, statusFilter]);

  const updateStatus = async (j: Job, status: string) => {
    await supabase.from('maintenance_jobs').update({ status } as any).eq('id', j.id);
    if (status === 'completed') {
      supabase.functions.invoke('run-pm-automations', {
        body: { rule_type: 'maintenance_update', maintenance_job_id: j.id, new_status: 'completed' },
      }).catch(() => {});
    }
    toast.success('Status updated');
    load();
  };

  const submitAssign = async () => {
    if (!assignFor || !assignSupplierId) return;
    const { error } = await supabase.from('maintenance_jobs').update({
      assigned_supplier_id: assignSupplierId,
      status: assignFor.status === 'new' ? 'assigned' : assignFor.status,
    } as any).eq('id', assignFor.id);
    if (error) { toast.error(error.message || 'Failed to assign'); return; }
    toast.success('Supplier assigned');
    const justAssigned = { ...assignFor, assigned_supplier_id: assignSupplierId };
    setAssignFor(null); setAssignSupplierId('');
    setEntryFor(justAssigned);
    setEntryDate('');
    load();
  };

  const submitEntryNotice = async () => {
    if (!entryFor || !entryDate) { toast.error('Select an entry date'); return; }
    const days = differenceInDays(parseISO(entryDate), new Date());
    if (days < 2) {
      toast.error('Entry date must be at least 2 days from today to comply with NSW notice requirements. VIC/QLD/SA/WA minimum is 24 hours.');
      return;
    }
    setEntrySaving(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('maintenance_jobs').update({
      scheduled_entry_date: entryDate,
      entry_notice_sent_at: nowIso,
    } as any).eq('id', entryFor.id);
    if (error) { setEntrySaving(false); toast.error(error.message || 'Failed to record entry notice'); return; }

    if (entryFor.tenant_email) {
      const formattedEntryDate = format(parseISO(entryDate), 'EEEE d MMMM yyyy');
      supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: agentId,
          type: 'entry_notice',
          recipient_email: entryFor.tenant_email,
          recipient_name: entryFor.tenant_name,
          property_address: entryFor.property_address,
          title: 'Entry Notice — Maintenance Access Required',
          message: `Notice is given that a contractor will enter the property at ${entryFor.property_address} on ${formattedEntryDate} to carry out: ${entryFor.title}. If you have any questions please contact your property manager.`,
        },
      }).catch(() => {});
    }

    setEntrySaving(false);
    setEntryFor(null);
    setEntryDate('');
    toast.success('Entry notice scheduled and tenant notified');
    load();
  };

  const submitQuote = async () => {
    if (!quoteFor || !quoteAmount) return;
    await supabase.from('maintenance_jobs').update({
      estimated_cost: parseFloat(quoteAmount),
      status: 'quoted',
    } as any).eq('id', quoteFor.id);
    toast.success('Quote saved');
    setQuoteFor(null); setQuoteAmount('');
    load();
  };

  const requestOwnerApproval = async (j: Job) => {
    supabase.functions.invoke('run-pm-automations', {
      body: { rule_type: 'quote_approval', maintenance_job_id: j.id },
    }).catch(() => {});
    toast.success('Owner approval requested');
  };

  const copyTenantLink = (j: Job) => {
    if (!j.tenant_portal_token) { toast.error('Portal link unavailable — no tenant assigned.'); return; }
    const url = `${window.location.origin}/maintenance/request?token=${j.tenant_portal_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Tenant request link copied');
  };

  if (!agentId || loading) return (
    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground mb-2">
        <span>Dashboard</span>
        <span className="mx-2">→</span>
        <span className="font-medium text-foreground">Maintenance</span>
        {expanded && jobs.find(j => j.id === expanded) && (
          <>
            <span className="mx-2">→</span>
            <span className="font-medium text-foreground">{jobs.find(j => j.id === expanded)?.title}</span>
          </>
        )}
      </nav>
      <DashboardHeader title={t('agent.pm.maintenance.title')} subtitle={t('agent.pm.maintenance.subtitle')} />

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue/></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Days open</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10"><Wrench size={20} className="mx-auto mb-2 opacity-40"/>No jobs</TableCell></TableRow>
                ) : filtered.map(j => {
                  const daysOpen = j.completed_at
                    ? differenceInDays(parseISO(j.completed_at), parseISO(j.created_at))
                    : differenceInDays(new Date(), parseISO(j.created_at));
                  return (
                  <>
                    <TableRow key={j.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setExpanded(expanded === j.id ? null : j.id)}>
                      <TableCell className="text-xs">{format(parseISO(j.created_at), 'd MMM')}</TableCell>
                      <TableCell className="text-sm font-medium">{j.property_address || '—'}</TableCell>
                      <TableCell className="text-sm">{j.tenant_name || '—'}</TableCell>
                      <TableCell className="text-sm">{j.title}</TableCell>
                      <TableCell className={`text-xs font-medium ${!j.completed_at && daysOpen > 7 ? 'text-red-600' : !j.completed_at && daysOpen > 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {daysOpen}d
                      </TableCell>
                      <TableCell>{priorityBadge(j.priority)}</TableCell>
                      <TableCell>{statusBadge(j.status)}</TableCell>
                      <TableCell className="text-sm">{j.supplier_name || j.assigned_to || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                      <TableCell>{expanded === j.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</TableCell>
                    </TableRow>
                    {expanded === j.id && (
                      <TableRow key={j.id + '-d'}>
                        <TableCell colSpan={9} className="bg-accent/20 px-6 py-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3 text-xs pb-2 border-b border-border/50">
                              {j.property_id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/rent-roll?property=${j.property_id}`); }}
                                  className="text-primary hover:underline font-medium"
                                >
                                   {j.property_address || 'View property'}
                                </button>
                              )}
                              {j.tenant_name && (
                                <span className="text-muted-foreground">Tenant: <span className="text-foreground font-medium">{j.tenant_name}</span></span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setExpanded(null); }} className="ml-auto text-muted-foreground hover:text-foreground">
                                ← Back to Maintenance
                              </button>
                            </div>
                            {j.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{j.description}</p>}
                            <div className="flex flex-wrap items-center gap-2">
                              <Select value={j.status} onValueChange={(v) => updateStatus(j, v)}>
                                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                  {STATUSES.filter(s => s !== 'all').map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" onClick={() => { setAssignFor(j); setAssignSupplierId(j.assigned_supplier_id || ''); }}>
                                {j.assigned_supplier_id ? 'Reassign supplier' : 'Assign supplier'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setQuoteFor(j); setQuoteAmount(j.estimated_cost ? String(j.estimated_cost) : ''); }}>
                                Add quote
                              </Button>
                              {j.estimated_cost && (
                                <Button size="sm" variant="outline" onClick={() => requestOwnerApproval(j)}>
                                  Request owner approval
                                </Button>
                              )}
                              {j.status !== 'completed' && (
                                <Button size="sm" onClick={() => updateStatus(j, 'completed')}>
                                  <CheckCircle2 size={12} className="mr-1"/> Mark complete
                                </Button>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                      <Button size="sm" variant="ghost" onClick={() => copyTenantLink(j)} disabled={!j.tenant_portal_token}>
                                        <Copy size={12} className="mr-1"/> Copy tenant link
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!j.tenant_portal_token && (
                                    <TooltipContent>Portal link unavailable — no tenant assigned.</TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              {j.tenancy_id && (
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/tenancies/${j.tenancy_id}`)}>
                                  Open tenancy →
                                </Button>
                              )}
                            </div>
                            {j.estimated_cost && (
                              <p className="text-xs text-muted-foreground">Quote: {AUD.format(j.estimated_cost)}{j.actual_cost ? ` · Actual: ${AUD.format(j.actual_cost)}` : ''}</p>
                            )}
                            <div className="space-y-2 pt-2 border-t border-border/50">
                              <Label className="text-xs flex items-center gap-1.5">
                                <Upload size={12} /> Photos
                              </Label>
                              <label
                                htmlFor={`photos-${j.id}`}
                                className="flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-accent/40 transition-colors text-xs text-muted-foreground"
                              >
                                {uploadingFor === j.id ? (
                                  <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                                ) : (
                                  <>Click to upload photos or drag and drop</>
                                )}
                                <input
                                  id={`photos-${j.id}`}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  disabled={uploadingFor === j.id}
                                  onChange={(e) => { uploadJobPhotos(j, e.target.files); e.currentTarget.value = ''; }}
                                />
                              </label>
                              {j.photo_urls && j.photo_urls.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {j.photo_urls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block w-20 h-20 rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <img src={url} alt={`Job photo ${idx + 1}`} className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 pt-2 border-t border-border/50">
                              <Label className="text-xs flex items-center gap-1.5">
                                <Receipt size={12} /> Supplier Invoice
                              </Label>
                              {j.invoice_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(j.invoice_url!, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="gap-1.5"
                                >
                                  <ExternalLink size={14} /> View Invoice
                                </Button>
                              ) : (
                                <p className="text-xs text-muted-foreground">No invoice uploaded yet</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign supplier dialog */}
      <Dialog open={!!assignFor} onOpenChange={o => !o && setAssignFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Supplier (active only)</Label>
            <Select value={assignSupplierId} onValueChange={setAssignSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No active suppliers — add some on the Suppliers page.</div>
                ) : suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.business_name} <span className="text-muted-foreground">· {s.trade_category}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Discard</Button>
            <Button onClick={submitAssign} disabled={!assignSupplierId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule entry notice dialog */}
      <Dialog open={!!entryFor} onOpenChange={o => { if (!o) { setEntryFor(null); setEntryDate(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Schedule entry & notify tenant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Planned entry date</Label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed">
              Entry notice required — NSW: 2 business days · VIC: 24 hours · SA/WA/QLD: 24 hours
            </div>
            {entryFor && !entryFor.tenant_email && (
              <p className="text-[11px] text-muted-foreground">No tenant email on file — record will be saved but no email will be sent.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEntryFor(null); setEntryDate(''); }} disabled={entrySaving}>Skip</Button>
            <Button onClick={submitEntryNotice} disabled={entrySaving || !entryDate}>
              {entrySaving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
              Send Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote dialog */}
      <Dialog open={!!quoteFor} onOpenChange={o => !o && setQuoteFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add quote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Quote amount (AUD)</Label>
              <Input type="number" step="0.01" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteFor(null)}>Discard</Button>
            <Button onClick={submitQuote} disabled={!quoteAmount}>Save quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
