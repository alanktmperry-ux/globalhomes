import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Wrench, Phone, Mail, CheckCircle2, Calendar, FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/features/agents/components/StarRating';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface Job {
  id: string; title: string; description: string;
  priority: string; status: string; created_at: string;
  supplier_notified_at: string|null; supplier_accepted_at: string|null;
  supplier_scheduled_date: string|null; supplier_scheduled_time: string|null;
  property_address: string; tenant_name: string|null; tenant_phone: string|null;
}
interface Completed {
  id: string; title: string; completed_at: string|null;
  final_cost_aud: number|null; property_address: string; rating: number|null;
}
interface Data {
  supplier: any; agent: any;
  active_jobs: Job[]; completed_jobs: Completed[];
}

export default function SupplierPortalPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentsByJob, setPaymentsByJob] = useState<Record<string, { paid_at: string } | null>>({});

  // dialogs
  const [scheduleJob, setScheduleJob] = useState<Job | null>(null);
  const [completeJob, setCompleteJob] = useState<Job | null>(null);
  const [schedDate, setSchedDate] = useState(''); const [schedTime, setSchedTime] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceName, setInvoiceName] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const load = async () => {
    if (!token) { setError('Missing token'); setLoading(false); return; }
    setLoading(true);
    const { data: res, error } = await supabase.rpc('get_supplier_by_portal_token' as any, { p_token: token });
    if (error || !res || (res as any).error) {
      setError('Invalid or expired link — please contact your property manager.');
      setLoading(false);
      return;
    }
    setData(res as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  const callAction = async (jobId: string, action: string, extra: any = {}) => {
    setBusy(true);
    const { data: res, error } = await supabase.rpc('supplier_action_on_job' as any, {
      p_token: token, p_job_id: jobId, p_action: action, ...extra,
    });
    setBusy(false);
    if (error || (res as any)?.error) { toast.error('Action failed'); return false; }
    return true;
  };

  const accept = async (j: Job) => {
    if (await callAction(j.id, 'accept')) { toast.success('Job accepted'); load(); }
  };
  const submitSchedule = async () => {
    if (!scheduleJob || !schedDate) return;
    if (await callAction(scheduleJob.id, 'schedule', { p_scheduled_date: schedDate, p_scheduled_time: schedTime || null })) {
      toast.success('Schedule proposed');
      setScheduleJob(null); setSchedDate(''); setSchedTime(''); load();
    }
  };
  const submitComplete = async () => {
    if (!completeJob) return;
    if (await callAction(completeJob.id, 'complete', {
      p_completion_notes: completionNotes || null,
      p_final_cost: finalCost ? Number(finalCost) : null,
      p_invoice_url: invoiceUrl || null,
    })) {
      toast.success('Job marked complete');
      setCompleteJob(null); setCompletionNotes(''); setFinalCost('');
      setInvoiceUrl(null); setInvoiceName(null);
      load();
    }
  };

  const uploadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !completeJob) return;
    if (!data?.supplier?.id) {
      toast.error('Cannot upload: missing supplier ID');
      return;
    }
    setUploadingInvoice(true);
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${data.supplier.id}/${completeJob.id}/invoice.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('maintenance-invoices')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploadingInvoice(false);
      e.target.value = '';
      toast.error('Invoice upload failed — you can mark complete and resend the invoice to your agent directly.');
      return;
    }
    const { data: urlData } = supabase.storage.from('maintenance-invoices').getPublicUrl(path);
    setInvoiceUrl(urlData.publicUrl);
    setInvoiceName(file.name);
    setUploadingInvoice(false);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md p-8 text-center">
        <Wrench className="mx-auto text-muted-foreground mb-3" size={32}/>
        <h1 className="text-lg font-bold mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    </div>
  );

  const { supplier, agent, active_jobs, completed_jobs } = data;

  const priorityBadge = (p: string) => (
    <Badge className={`text-[10px] ${
      p === 'urgent' ? 'bg-destructive text-destructive-foreground' :
      p === 'low' ? 'bg-muted text-muted-foreground' :
      'bg-amber-500 text-white'
    }`}>{p}</Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Supplier Portal — ListHQ</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={20} className="text-primary"/>
            <span className="font-bold">ListHQ</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Tradesperson Portal</Badge>
          </div>
          <h1 className="text-2xl font-bold">Hi, {supplier.business_name}</h1>
          {agent && (
            <Card className="mt-3 p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Property Manager</p>
              <p className="font-semibold">{agent.name}</p>
              <div className="flex gap-3 mt-1.5 text-sm">
                {agent.phone && <a href={`tel:${agent.phone}`} className="flex items-center gap-1 text-primary"><Phone size={12}/>{agent.phone}</a>}
                {agent.email && <a href={`mailto:${agent.email}`} className="flex items-center gap-1 text-primary"><Mail size={12}/>{agent.email}</a>}
              </div>
            </Card>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Active Jobs */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            Active Jobs <Badge variant="secondary">{active_jobs.length}</Badge>
          </h2>
          {active_jobs.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No active jobs assigned to you.</Card>
          ) : (
            <div className="space-y-3">
              {active_jobs.map(j => (
                <Card key={j.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.property_address}</p>
                    </div>
                    {priorityBadge(j.priority)}
                  </div>
                  {j.description && <p className="text-sm text-foreground/80 whitespace-pre-line">{j.description}</p>}
                  {j.tenant_name && (
                    <div className="bg-muted/30 p-2.5 rounded-lg text-sm">
                      <p className="text-xs text-muted-foreground">Tenant contact</p>
                      <p>{j.tenant_name}{j.tenant_phone && <> · <a href={`tel:${j.tenant_phone}`} className="text-primary">{j.tenant_phone}</a></>}</p>
                    </div>
                  )}
                  {j.supplier_scheduled_date && (
                    <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                      <Calendar size={14}/> Scheduled: {new Date(j.supplier_scheduled_date).toLocaleDateString()} {j.supplier_scheduled_time}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {!j.supplier_accepted_at && (
                      <Button size="sm" onClick={()=>accept(j)} disabled={busy} className="gap-1.5">
                        <CheckCircle2 size={14}/> Accept Job
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={()=>{ setScheduleJob(j); setSchedDate(j.supplier_scheduled_date||''); setSchedTime(j.supplier_scheduled_time||''); }}>
                      <Calendar size={14} className="mr-1.5"/> {j.supplier_scheduled_date ? 'Reschedule' : 'Propose Schedule'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={()=>setCompleteJob(j)}>
                      <FileText size={14} className="mr-1.5"/> Mark Complete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Completed */}
        <section>
          <h2 className="text-lg font-bold mb-3">Recent Completed Jobs</h2>
          {completed_jobs.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No completed jobs yet.</Card>
          ) : (
            <div className="space-y-2">
              {completed_jobs.map(c => (
                <Card key={c.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.property_address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {c.final_cost_aud != null && <p className="text-sm font-semibold">{AUD.format(Number(c.final_cost_aud))}</p>}
                    {c.rating ? <StarRating rating={c.rating} size="sm"/> : <p className="text-[10px] text-muted-foreground">No rating</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Details */}
        <section>
          <h2 className="text-lg font-bold mb-3">My Details</h2>
          <Card className="p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span>{supplier.business_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trade</span><span className="capitalize">{supplier.trade_category?.replace('_',' ')}</span></div>
            {supplier.abn && <div className="flex justify-between"><span className="text-muted-foreground">ABN</span><span>{supplier.abn}</span></div>}
            {supplier.license_number && <div className="flex justify-between"><span className="text-muted-foreground">License</span><span>{supplier.license_number}</span></div>}
            {supplier.insurance_expiry && <div className="flex justify-between"><span className="text-muted-foreground">Insurance expires</span><span>{new Date(supplier.insurance_expiry).toLocaleDateString()}</span></div>}
            <div className="flex justify-between items-center pt-1 border-t border-border">
              <span className="text-muted-foreground">Rating</span><StarRating rating={Number(supplier.rating_avg)||0} size="sm"/>
            </div>
            <p className="text-xs text-muted-foreground pt-2">To update these details, contact {agent?.name} on {agent?.phone || agent?.email}.</p>
          </Card>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-6">
          Powered by ListHQ
          <p className="text-xs text-muted-foreground mt-1">Your information is handled in accordance with the <a href="https://listhq.com.au/privacy" className="underline hover:text-foreground">ListHQ Privacy Policy</a>.</p>
        </footer>
      </main>

      {/* Schedule dialog */}
      <Dialog open={!!scheduleJob} onOpenChange={o=>!o && setScheduleJob(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Propose Schedule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)}/></div>
            <div><Label className="text-xs">Time</Label><Input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setScheduleJob(null)}>Cancel</Button>
            <Button onClick={submitSchedule} disabled={busy || !schedDate}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={!!completeJob} onOpenChange={o=>{ if (!o) { setCompleteJob(null); setInvoiceUrl(null); setInvoiceName(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark Complete</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Final cost (AUD)</Label><Input type="number" value={finalCost} onChange={e=>setFinalCost(e.target.value)}/></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={3} value={completionNotes} onChange={e=>setCompletionNotes(e.target.value)} placeholder="What was done…"/></div>
            <div>
              <Label className="text-xs">Upload invoice (optional)</Label>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/jpg"
                onChange={uploadInvoice}
                disabled={uploadingInvoice}
                className="cursor-pointer"
              />
              {uploadingInvoice && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin"/> Uploading…
                </p>
              )}
              {invoiceName && !uploadingInvoice && (
                <p className="text-[11px] mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={11}/> {invoiceName}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{ setCompleteJob(null); setInvoiceUrl(null); setInvoiceName(null); }}>Cancel</Button>
            <Button onClick={submitComplete} disabled={busy || uploadingInvoice}>Mark Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
