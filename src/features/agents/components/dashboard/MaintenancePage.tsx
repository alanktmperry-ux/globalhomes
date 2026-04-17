import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
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
import { Wrench, Loader2, Copy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

interface Job {
  id: string;
  property_id: string;
  tenancy_id: string | null;
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
  supplier_name?: string | null;
}

interface Supplier { id: string; business_name: string; trade_category: string; email: string | null; }

const STATUSES = ['all', 'new', 'acknowledged', 'assigned', 'in_progress', 'completed', 'cancelled'];

const statusBadge = (s: string) => {
  const map: Record<string,string> = {
    new: 'bg-blue-500/15 text-blue-700',
    acknowledged: 'bg-amber-500/15 text-amber-700',
    assigned: 'bg-amber-500/15 text-amber-700',
    in_progress: 'bg-primary/15 text-primary',
    completed: 'bg-emerald-500/15 text-emerald-700',
    cancelled: 'bg-muted text-muted-foreground',
  };
  return <Badge className={`border-0 ${map[s] || ''}`}>{s.replace('_',' ')}</Badge>;
};

const priorityBadge = (p: string) => (
  <Badge className={`border-0 ${
    p === 'urgent' ? 'bg-red-500/15 text-red-700' :
    p === 'low' ? 'bg-blue-500/15 text-blue-700' :
    'bg-amber-500/15 text-amber-700'
  }`}>{p}</Badge>
);

export default function MaintenancePage() {
  const agentId = useAgentId();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  // assign dialog
  const [assignFor, setAssignFor] = useState<Job | null>(null);
  const [assignSupplierId, setAssignSupplierId] = useState<string>('');

  // quote dialog
  const [quoteFor, setQuoteFor] = useState<Job | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const [{ data: js }, { data: sups }] = await Promise.all([
      supabase
        .from('maintenance_jobs')
        .select('*, properties:property_id(address, suburb), tenancies:tenancy_id(tenant_name), supplier:assigned_supplier_id(business_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false }),
      supabase.from('suppliers' as any).select('id, business_name, trade_category, email').eq('agent_id', agentId).eq('status', 'active'),
    ]);
    const list: Job[] = (js || []).map((j: any) => ({
      ...j,
      property_address: j.properties ? `${j.properties.address}, ${j.properties.suburb}` : null,
      tenant_name: j.tenancies?.tenant_name || null,
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
    await supabase.from('maintenance_jobs').update({
      assigned_supplier_id: assignSupplierId,
      status: assignFor.status === 'new' ? 'assigned' : assignFor.status,
    } as any).eq('id', assignFor.id);
    toast.success('Supplier assigned');
    setAssignFor(null); setAssignSupplierId('');
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
    if (!j.tenancy_id) { toast.error('Job not linked to a tenancy'); return; }
    const url = `${window.location.origin}/maintenance/request?token=${j.tenancy_id}`;
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
      <DashboardHeader title="Maintenance" subtitle="All maintenance jobs across your managed properties." />

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
                                  📍 {j.property_address || 'View property'}
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
                              <Button size="sm" variant="ghost" onClick={() => copyTenantLink(j)}>
                                <Copy size={12} className="mr-1"/> Copy tenant link
                              </Button>
                              {j.tenancy_id && (
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/tenancies/${j.tenancy_id}`)}>
                                  Open tenancy →
                                </Button>
                              )}
                            </div>
                            {j.estimated_cost && (
                              <p className="text-xs text-muted-foreground">Quote: {AUD.format(j.estimated_cost)}{j.actual_cost ? ` · Actual: ${AUD.format(j.actual_cost)}` : ''}</p>
                            )}
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
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={!assignSupplierId}>Assign</Button>
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
            <Button variant="outline" onClick={() => setQuoteFor(null)}>Cancel</Button>
            <Button onClick={submitQuote} disabled={!quoteAmount}>Save quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
