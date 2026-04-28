import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import {
  Key, Plus, Search, Edit, Printer, Loader2, AlertTriangle,
  CalendarIcon, ArrowRightLeft, XCircle, CheckCircle2,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import DashboardHeader from './DashboardHeader';
import { cn } from '@/shared/lib/utils';

type KeyType =
  | 'front_door' | 'back_door' | 'garage' | 'letterbox' | 'pool'
  | 'common_area' | 'side_gate' | 'storage' | 'other';
type KeyStatus = 'available' | 'issued' | 'lost' | 'cut';
type IssuedToType = 'tenant' | 'owner' | 'agent' | 'tradesperson' | 'contractor' | 'other';

interface PropertyLite { id: string; address: string; suburb: string | null; }
interface TenancyLite { id: string; tenant_name: string | null; property_id: string; status: string; }

interface KeyRow {
  id: string;
  agent_id: string;
  property_id: string;
  tenancy_id: string | null;
  key_type: KeyType;
  description: string | null;
  tag_number: string | null;
  total_sets: number;
  status: KeyStatus;
  issued_to_name: string | null;
  issued_to_type: IssuedToType | null;
  issued_date: string | null;
  expected_return_date: string | null;
  returned_date: string | null;
  notes: string | null;
  created_at: string;
  properties?: { address: string; suburb: string | null } | null;
  tenancies?: { tenant_name: string | null } | null;
}

const KEY_TYPE_LABELS: Record<KeyType, string> = {
  front_door: 'Front Door',
  back_door: 'Back Door',
  garage: 'Garage',
  letterbox: 'Letterbox',
  pool: 'Pool',
  common_area: 'Common Area',
  side_gate: 'Side Gate',
  storage: 'Storage',
  other: 'Other',
};
const KEY_TYPE_OPTIONS = Object.entries(KEY_TYPE_LABELS) as [KeyType, string][];

const ISSUED_TO_LABELS: Record<IssuedToType, string> = {
  tenant: 'Tenant',
  owner: 'Owner',
  agent: 'Agent',
  tradesperson: 'Tradesperson',
  contractor: 'Contractor',
  other: 'Other',
};

const STATUS_BADGE: Record<KeyStatus, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 border-0',
  issued: 'bg-amber-500/15 text-amber-700 border-0',
  lost: 'bg-red-500/15 text-red-700 border-0',
  cut: 'bg-purple-500/15 text-purple-700 border-0',
};
const STATUS_LABEL: Record<KeyStatus, string> = {
  available: 'Available',
  issued: 'Issued',
  lost: 'Lost',
  cut: 'Cut',
};

interface AddEditForm {
  id?: string;
  property_id: string;
  tenancy_id: string;
  key_type: KeyType;
  description: string;
  tag_number: string;
  total_sets: number;
  notes: string;
}
const emptyAddForm = (): AddEditForm => ({
  property_id: '', tenancy_id: '', key_type: 'front_door',
  description: '', tag_number: '', total_sets: 1, notes: '',
});

interface IssueForm {
  issued_to_name: string;
  issued_to_type: IssuedToType;
  issued_date: Date;
  expected_return_date?: Date;
  notes: string;
}

interface ReturnForm {
  returned_date: Date;
  notes: string;
}

export default function KeyRegisterPage() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [tenancies, setTenancies] = useState<TenancyLite[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | KeyStatus>('all');

  const [addEdit, setAddEdit] = useState<AddEditForm | null>(null);
  const [savingAddEdit, setSavingAddEdit] = useState(false);

  const [issueTarget, setIssueTarget] = useState<KeyRow | null>(null);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    issued_to_name: '', issued_to_type: 'tenant', issued_date: new Date(), notes: '',
  });
  const [savingIssue, setSavingIssue] = useState(false);

  const [returnTarget, setReturnTarget] = useState<KeyRow | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnForm>({ returned_date: new Date(), notes: '' });
  const [savingReturn, setSavingReturn] = useState(false);

  const [lostTarget, setLostTarget] = useState<KeyRow | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!agent) { setLoading(false); return; }
    const aid = (agent as any).id as string;
    setAgentId(aid);

    const [keysRes, propsRes, tensRes] = await Promise.all([
      supabase
        .from('key_register' as any)
        .select('*, properties(address, suburb), tenancies(tenant_name)')
        .eq('agent_id', aid),
      supabase
        .from('properties')
        .select('id, address, suburb')
        .eq('agent_id', aid)
        .order('address'),
      supabase
        .from('tenancies')
        .select('id, tenant_name, property_id, status')
        .eq('agent_id', aid),
    ]);

    if (keysRes.error) toast.error('Could not load keys');
    const rows = ((keysRes.data as any) || []) as KeyRow[];
    rows.sort((a, b) => {
      const addr = (a.properties?.address || '').localeCompare(b.properties?.address || '');
      if (addr !== 0) return addr;
      return a.key_type.localeCompare(b.key_type);
    });
    setKeys(rows);
    setProperties(((propsRes.data as any) || []) as PropertyLite[]);
    setTenancies(((tensRes.data as any) || []) as TenancyLite[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtering
  const filteredKeys = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const q = search.trim().toLowerCase();
    return keys.filter(k => {
      if (statusFilter !== 'all' && k.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        k.properties?.address, k.tag_number, k.issued_to_name,
        k.description, KEY_TYPE_LABELS[k.key_type],
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).map(k => ({
      ...k,
      _overdue: !!(k.status === 'issued' && k.expected_return_date && k.expected_return_date < today && !k.returned_date),
    }));
  }, [keys, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalSets = 0, available = 0, issued = 0, lost = 0, overdue = 0;
    for (const k of keys) {
      totalSets += Number(k.total_sets || 0);
      if (k.status === 'available') available++;
      else if (k.status === 'issued') {
        issued++;
        if (k.expected_return_date && k.expected_return_date < today && !k.returned_date) overdue++;
      } else if (k.status === 'lost') lost++;
    }
    return { totalSets, available, issued, lost, overdue };
  }, [keys]);

  // Group by property
  const grouped = useMemo(() => {
    const map = new Map<string, { property: PropertyLite | null; rows: typeof filteredKeys }>();
    for (const k of filteredKeys) {
      const key = k.property_id;
      if (!map.has(key)) {
        map.set(key, {
          property: properties.find(p => p.id === k.property_id) || (k.properties ? { id: k.property_id, address: k.properties.address, suburb: k.properties.suburb } : null),
          rows: [] as any,
        });
      }
      map.get(key)!.rows.push(k);
    }
    return Array.from(map.values());
  }, [filteredKeys, properties]);

  // Handlers
  const openAdd = () => setAddEdit(emptyAddForm());
  const openEdit = (k: KeyRow) => setAddEdit({
    id: k.id,
    property_id: k.property_id,
    tenancy_id: k.tenancy_id || '',
    key_type: k.key_type,
    description: k.description || '',
    tag_number: k.tag_number || '',
    total_sets: k.total_sets,
    notes: k.notes || '',
  });

  const saveAddEdit = async () => {
    if (!addEdit || !agentId) return;
    if (!addEdit.property_id) { toast.error('Property is required'); return; }
    if (!addEdit.key_type) { toast.error('Key type is required'); return; }
    setSavingAddEdit(true);
    const payload: any = {
      agent_id: agentId,
      property_id: addEdit.property_id,
      tenancy_id: addEdit.tenancy_id || null,
      key_type: addEdit.key_type,
      description: addEdit.description.trim() || null,
      tag_number: addEdit.tag_number.trim() || null,
      total_sets: Math.max(1, Number(addEdit.total_sets) || 1),
      notes: addEdit.notes.trim() || null,
    };
    let error;
    if (addEdit.id) {
      ({ error } = await supabase.from('key_register' as any).update(payload).eq('id', addEdit.id));
    } else {
      ({ error } = await supabase.from('key_register' as any).insert(payload));
    }
    setSavingAddEdit(false);
    if (error) { toast.error('Could not save key'); return; }
    toast.success('Key saved');
    setAddEdit(null);
    loadData();
  };

  const openIssue = (k: KeyRow) => {
    setIssueTarget(k);
    setIssueForm({ issued_to_name: '', issued_to_type: 'tenant', issued_date: new Date(), notes: '' });
  };
  const submitIssue = async () => {
    if (!issueTarget) return;
    if (!issueForm.issued_to_name.trim()) { toast.error('Name is required'); return; }
    setSavingIssue(true);
    const payload: any = {
      status: 'issued',
      issued_to_name: issueForm.issued_to_name.trim(),
      issued_to_type: issueForm.issued_to_type,
      issued_date: format(issueForm.issued_date, 'yyyy-MM-dd'),
      expected_return_date: issueForm.expected_return_date ? format(issueForm.expected_return_date, 'yyyy-MM-dd') : null,
      returned_date: null,
      notes: issueForm.notes.trim() || issueTarget.notes || null,
    };
    const { error } = await supabase.from('key_register' as any).update(payload).eq('id', issueTarget.id);
    setSavingIssue(false);
    if (error) { toast.error('Could not issue key'); return; }
    toast.success(`Key issued to ${issueForm.issued_to_name.trim()}`);
    setIssueTarget(null);
    loadData();
  };

  const openReturn = (k: KeyRow) => {
    setReturnTarget(k);
    setReturnForm({ returned_date: new Date(), notes: '' });
  };
  const submitReturn = async () => {
    if (!returnTarget) return;
    setSavingReturn(true);
    const payload: any = {
      status: 'available',
      returned_date: format(returnForm.returned_date, 'yyyy-MM-dd'),
      issued_to_name: null,
      issued_to_type: null,
      issued_date: null,
      expected_return_date: null,
      notes: returnForm.notes.trim() || returnTarget.notes || null,
    };
    const { error } = await supabase.from('key_register' as any).update(payload).eq('id', returnTarget.id);
    setSavingReturn(false);
    if (error) { toast.error('Could not return key'); return; }
    toast.success('Key returned');
    setReturnTarget(null);
    loadData();
  };

  const confirmLost = async () => {
    if (!lostTarget) return;
    const { error } = await supabase.from('key_register' as any).update({ status: 'lost' }).eq('id', lostTarget.id);
    if (error) { toast.error('Could not update'); return; }
    toast.success('Key marked as lost');
    setLostTarget(null);
    loadData();
  };

  const handlePrint = () => window.print();

  const tenanciesForProp = (pid: string) => tenancies.filter(t => t.property_id === pid);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Key Register"
        subtitle="Track all property keys across your portfolio"
      />

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-6 print:p-0">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by property, tag number, or person…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="issued">Issued</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={14} className="mr-1.5" /> Print Register
            </Button>
            <Button onClick={openAdd}>
              <Plus size={14} className="mr-1.5" /> Add Key
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <StatCard label="Total Key Sets" value={stats.totalSets} />
          <StatCard label="Available" value={stats.available} tone="emerald" />
          <StatCard label="Issued" value={stats.issued} tone="amber" />
          <StatCard label="Lost / Overdue" value={stats.lost + stats.overdue} tone="red" />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading keys…
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="mx-auto mb-3 text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">
                {keys.length === 0
                  ? 'No keys yet. Add your first key to get started.'
                  : 'No keys match your filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Print-only header table */}
            <div className="hidden print:block mb-4">
              <h1 className="text-xl font-semibold">Key Register</h1>
              <p className="text-xs text-muted-foreground">Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
            </div>

            {/* Print table */}
            <div className="hidden print:block">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">Property</th>
                    <th className="text-left p-1">Key</th>
                    <th className="text-left p-1">Tag</th>
                    <th className="text-left p-1">Sets</th>
                    <th className="text-left p-1">Status</th>
                    <th className="text-left p-1">Issued To</th>
                    <th className="text-left p-1">Issued</th>
                    <th className="text-left p-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.map(k => (
                    <tr key={k.id} className="border-b">
                      <td className="p-1">{k.properties?.address || '—'}</td>
                      <td className="p-1">{KEY_TYPE_LABELS[k.key_type]}{k.description ? ` (${k.description})` : ''}</td>
                      <td className="p-1 font-mono">{k.tag_number || '—'}</td>
                      <td className="p-1">{k.total_sets}</td>
                      <td className="p-1">{STATUS_LABEL[k.status]}</td>
                      <td className="p-1">{k.issued_to_name ? `${k.issued_to_name}${k.issued_to_type ? ` (${ISSUED_TO_LABELS[k.issued_to_type]})` : ''}` : '—'}</td>
                      <td className="p-1">{k.issued_date ? format(parseISO(k.issued_date), 'dd MMM yyyy') : '—'}</td>
                      <td className="p-1">{k.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Screen view */}
            <div className="space-y-4 print:hidden">
              {grouped.map((g, i) => (
                <Card key={i}>
                  <div className="sticky top-0 z-10 bg-secondary/60 backdrop-blur px-4 py-2 border-b border-border/50 rounded-t-lg">
                    <div className="text-sm font-semibold">
                      {g.property?.address || 'Unknown property'}
                    </div>
                    {g.property?.suburb && (
                      <div className="text-xs text-muted-foreground">{g.property.suburb}</div>
                    )}
                  </div>
                  <CardContent className="p-0 divide-y divide-border/50">
                    {g.rows.map(k => {
                      const overdueDays = k._overdue && k.expected_return_date
                        ? differenceInDays(new Date(), parseISO(k.expected_return_date))
                        : 0;
                      return (
                        <div key={k.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {k.tag_number ? (
                                <Badge variant="outline" className="font-mono text-[11px]">#{k.tag_number}</Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">No tag</span>
                              )}
                              <span className="font-medium text-sm">{KEY_TYPE_LABELS[k.key_type]}</span>
                              {k.description && (
                                <span className="text-xs text-muted-foreground">— {k.description}</span>
                              )}
                              <Badge className={STATUS_BADGE[k.status] + ' text-[10px]'}>{STATUS_LABEL[k.status]}</Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {k.total_sets} {k.total_sets === 1 ? 'set' : 'sets'}
                              </span>
                            </div>
                            {k.status === 'issued' && k.issued_to_name && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Issued to <span className="font-medium text-foreground">{k.issued_to_name}</span>
                                {k.issued_to_type && ` (${ISSUED_TO_LABELS[k.issued_to_type]})`}
                                {k.issued_date && ` — ${format(parseISO(k.issued_date), 'dd MMM yyyy')}`}
                              </div>
                            )}
                            {k._overdue && (
                              <div className="mt-1 text-xs text-red-700 font-medium flex items-center gap-1">
                                <AlertTriangle size={12} /> Overdue {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(k)}>
                              <Edit size={13} className="mr-1" /> Edit
                            </Button>
                            {k.status === 'available' && (
                              <Button size="sm" variant="outline" onClick={() => openIssue(k)}>
                                <ArrowRightLeft size={13} className="mr-1" /> Issue
                              </Button>
                            )}
                            {k.status === 'issued' && (
                              <Button size="sm" variant="outline" onClick={() => openReturn(k)}>
                                <CheckCircle2 size={13} className="mr-1" /> Return
                              </Button>
                            )}
                            {k.status !== 'lost' && (
                              <Button size="sm" variant="ghost" className="text-red-700 hover:text-red-800" onClick={() => setLostTarget(k)}>
                                <XCircle size={13} className="mr-1" /> Mark Lost
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={!!addEdit} onOpenChange={(o) => !o && setAddEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{addEdit?.id ? 'Edit Key' : 'Add Key'}</DialogTitle>
          </DialogHeader>
          {addEdit && (
            <div className="space-y-3">
              <div>
                <Label>Property *</Label>
                <Select
                  value={addEdit.property_id}
                  onValueChange={(v) => setAddEdit({ ...addEdit, property_id: v, tenancy_id: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.address}{p.suburb ? `, ${p.suburb}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tenancy (optional)</Label>
                <Select
                  value={addEdit.tenancy_id || 'none'}
                  onValueChange={(v) => setAddEdit({ ...addEdit, tenancy_id: v === 'none' ? '' : v })}
                  disabled={!addEdit.property_id}
                >
                  <SelectTrigger><SelectValue placeholder="No linked tenancy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked tenancy</SelectItem>
                    {tenanciesForProp(addEdit.property_id).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tenant_name || 'Unnamed tenant'} ({t.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Key Type *</Label>
                <Select
                  value={addEdit.key_type}
                  onValueChange={(v) => setAddEdit({ ...addEdit, key_type: v as KeyType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KEY_TYPE_OPTIONS.map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Front door master, Tenant copy #1"
                  value={addEdit.description}
                  onChange={e => setAddEdit({ ...addEdit, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tag Number</Label>
                  <Input
                    value={addEdit.tag_number}
                    onChange={e => setAddEdit({ ...addEdit, tag_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Number of Sets</Label>
                  <Input
                    type="number"
                    min={1}
                    value={addEdit.total_sets}
                    onChange={e => setAddEdit({ ...addEdit, total_sets: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={addEdit.notes}
                  onChange={e => setAddEdit({ ...addEdit, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEdit(null)} disabled={savingAddEdit}>Cancel</Button>
            <Button onClick={saveAddEdit} disabled={savingAddEdit}>
              {savingAddEdit && <Loader2 size={14} className="mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Key Modal */}
      <Dialog open={!!issueTarget} onOpenChange={(o) => !o && setIssueTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Issue Key — {issueTarget?.tag_number ? `#${issueTarget.tag_number}` : (issueTarget?.description || (issueTarget && KEY_TYPE_LABELS[issueTarget.key_type]))}
            </DialogTitle>
          </DialogHeader>
          {issueTarget && (
            <div className="space-y-3">
              <div>
                <Label>Issue To (Name) *</Label>
                <Input
                  value={issueForm.issued_to_name}
                  onChange={e => setIssueForm({ ...issueForm, issued_to_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={issueForm.issued_to_type}
                  onValueChange={(v) => setIssueForm({ ...issueForm, issued_to_type: v as IssuedToType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ISSUED_TO_LABELS) as IssuedToType[]).map(v => (
                      <SelectItem key={v} value={v}>{ISSUED_TO_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="Issue Date"
                  value={issueForm.issued_date}
                  onChange={(d) => d && setIssueForm({ ...issueForm, issued_date: d })}
                />
                <DateField
                  label="Expected Return"
                  value={issueForm.expected_return_date}
                  onChange={(d) => setIssueForm({ ...issueForm, expected_return_date: d || undefined })}
                  optional
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={issueForm.notes}
                  onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueTarget(null)} disabled={savingIssue}>Cancel</Button>
            <Button onClick={submitIssue} disabled={savingIssue}>
              {savingIssue && <Loader2 size={14} className="mr-1 animate-spin" />}
              Issue Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Key Modal */}
      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Return Key — {returnTarget?.tag_number ? `#${returnTarget.tag_number}` : (returnTarget?.description || (returnTarget && KEY_TYPE_LABELS[returnTarget.key_type]))}
            </DialogTitle>
          </DialogHeader>
          {returnTarget && (
            <div className="space-y-3">
              <div className="rounded-md bg-secondary/50 p-3 text-xs">
                Currently issued to <span className="font-semibold">{returnTarget.issued_to_name || '—'}</span>
                {returnTarget.issued_date && <> since {format(parseISO(returnTarget.issued_date), 'dd MMM yyyy')}</>}
              </div>
              <DateField
                label="Return Date"
                value={returnForm.returned_date}
                onChange={(d) => d && setReturnForm({ ...returnForm, returned_date: d })}
              />
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)} disabled={savingReturn}>Cancel</Button>
            <Button onClick={submitReturn} disabled={savingReturn}>
              {savingReturn && <Loader2 size={14} className="mr-1 animate-spin" />}
              Mark Returned
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Lost confirm */}
      <AlertDialog open={!!lostTarget} onOpenChange={(o) => !o && setLostTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this key as lost?</AlertDialogTitle>
            <AlertDialogDescription>
              This will record the key as unaccounted for. You can edit the record at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Mark Lost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'amber' ? 'text-amber-700' :
    tone === 'red' ? 'text-red-700' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-2xl font-semibold mt-1', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DateField({
  label, value, onChange, optional,
}: { label: string; value?: Date; onChange: (d?: Date) => void; optional?: boolean }) {
  return (
    <div className="flex flex-col">
      <Label>{label}{optional && <span className="text-muted-foreground"> (optional)</span>}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal mt-1',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'dd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => onChange(d || undefined)}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
