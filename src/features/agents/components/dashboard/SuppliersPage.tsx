import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Star, AlertTriangle, Search, Wrench, Copy, Loader2, BarChart3, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { StarRating } from '@/features/agents/components/StarRating';
import { toast } from 'sonner';

const TRADES = [
  'plumbing','electrical','carpentry','painting','cleaning','pest_control',
  'landscaping','roofing','hvac','locksmith','glazing','general_maintenance','other',
];
const TRADE_LABELS: Record<string,string> = {
  plumbing:'Plumbing', electrical:'Electrical', carpentry:'Carpentry',
  painting:'Painting', cleaning:'Cleaning', pest_control:'Pest Control',
  landscaping:'Landscaping', roofing:'Roofing', hvac:'HVAC',
  locksmith:'Locksmith', glazing:'Glazing', general_maintenance:'General', other:'Other',
};

interface Supplier {
  id: string; agent_id: string; business_name: string; contact_name: string|null;
  email: string|null; phone: string|null; trade_category: string;
  abn: string|null; license_number: string|null; insurance_expiry: string|null;
  insurance_document_url: string|null; preferred: boolean;
  rating_avg: number; jobs_completed: number; jobs_cancelled: number;
  notes: string|null; status: string; portal_token: string; created_at: string;
}

const empty = {
  business_name: '', contact_name: '', email: '', phone: '',
  trade_category: 'general_maintenance', abn: '', license_number: '',
  insurance_expiry: '', preferred: false, notes: '', status: 'active',
};

export default function SuppliersPage() {
  const agentId = useAgentId();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'cards'|'performance'>('cards');
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase.from('suppliers' as any).select('*')
      .eq('agent_id', agentId).order('preferred', { ascending: false }).order('business_name');
    setSuppliers((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agentId]);

  const filtered = useMemo(() => suppliers.filter(s => {
    if (tradeFilter !== 'all' && s.trade_category !== tradeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !`${s.business_name} ${s.contact_name||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [suppliers, tradeFilter, statusFilter, search]);

  const expiringSoon = useMemo(() => suppliers.filter(s => {
    if (!s.insurance_expiry) return false;
    const days = Math.floor((new Date(s.insurance_expiry).getTime() - Date.now()) / 86400000);
    return days < 30;
  }), [suppliers]);

  const openAdd = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      business_name: s.business_name, contact_name: s.contact_name || '',
      email: s.email || '', phone: s.phone || '',
      trade_category: s.trade_category, abn: s.abn || '',
      license_number: s.license_number || '',
      insurance_expiry: s.insurance_expiry || '',
      preferred: s.preferred, notes: s.notes || '', status: s.status,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.business_name.trim()) { toast.error('Business name required'); return; }
    if (!agentId) return;
    setSaving(true);
    const payload: any = {
      agent_id: agentId,
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      trade_category: form.trade_category,
      abn: form.abn.trim() || null,
      license_number: form.license_number.trim() || null,
      insurance_expiry: form.insurance_expiry || null,
      preferred: form.preferred,
      notes: form.notes.trim() || null,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from('suppliers' as any).update(payload).eq('id', editing.id)
      : await supabase.from('suppliers' as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Supplier updated' : 'Supplier added');
    setShowForm(false); load();
  };

  const insuranceBadge = (date: string|null) => {
    if (!date) return <Badge variant="outline" className="text-[10px]">No insurance on file</Badge>;
    const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
    if (days < 0) return <Badge className="text-[10px] bg-destructive text-destructive-foreground">Expired</Badge>;
    if (days < 30) return <Badge className="text-[10px] bg-destructive text-destructive-foreground">{days}d left</Badge>;
    if (days < 60) return <Badge className="text-[10px] bg-amber-500 text-white">{days}d left</Badge>;
    return <Badge className="text-[10px] bg-emerald-500 text-white">Insured</Badge>;
  };

  const statusBadge = (s: string) => (
    <Badge className={`text-[10px] ${
      s === 'active' ? 'bg-emerald-500 text-white' :
      s === 'blacklisted' ? 'bg-destructive text-destructive-foreground' :
      'bg-muted text-muted-foreground'
    }`}>{s}</Badge>
  );

  const copyPortal = (token: string) => {
    const url = `${window.location.origin}/supplier/portal?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Portal link copied');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench size={20} /> Tradespeople</h1>
          <p className="text-sm text-muted-foreground">Manage your preferred trades and assign maintenance jobs.</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5"><Plus size={16}/> Add Supplier</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{suppliers.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Preferred</p><p className="text-2xl font-bold">{suppliers.filter(s=>s.preferred).length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{suppliers.filter(s=>s.status==='active').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Insurance Alerts</p><p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p></Card>
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>{expiringSoon.length}</strong> supplier{expiringSoon.length>1?'s have':' has'} insurance expiring soon — review before assigning jobs.
          </p>
        </div>
      )}

      {/* Filters & view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trades</SelectItem>
            {TRADES.map(t => <SelectItem key={t} value={t}>{TRADE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-lg p-0.5">
          <Button size="sm" variant={view==='cards'?'default':'ghost'} className="h-8 gap-1" onClick={()=>setView('cards')}>
            <LayoutGrid size={13}/> Cards
          </Button>
          <Button size="sm" variant={view==='performance'?'default':'ghost'} className="h-8 gap-1" onClick={()=>setView('performance')}>
            <BarChart3 size={13}/> Performance
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="mx-auto text-muted-foreground mb-2" size={32}/>
          <p className="text-sm text-muted-foreground">No suppliers match your filters.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add your first supplier</Button>
        </Card>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <Card key={s.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{s.business_name}</p>
                    {s.preferred && <Star size={12} fill="currentColor" className="text-amber-500 shrink-0" />}
                  </div>
                  {s.contact_name && <p className="text-xs text-muted-foreground truncate">{s.contact_name}</p>}
                </div>
                {statusBadge(s.status)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{TRADE_LABELS[s.trade_category] || s.trade_category}</Badge>
                {insuranceBadge(s.insurance_expiry)}
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={Number(s.rating_avg) || 0} size="sm" />
                <span className="text-xs text-muted-foreground">· {s.jobs_completed} jobs</span>
              </div>
              {(s.email || s.phone) && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {s.email && <p className="truncate">✉ {s.email}</p>}
                  {s.phone && <p>📞 {s.phone}</p>}
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={()=>openEdit(s)}>
                  <Pencil size={12} className="mr-1"/> Edit
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={()=>copyPortal(s.portal_token)} title="Copy portal link">
                  <Copy size={12}/>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Jobs Done</TableHead>
                <TableHead>Cancelled</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...filtered].sort((a,b)=>Number(b.rating_avg)-Number(a.rating_avg)).map(s => (
                <TableRow key={s.id} className="cursor-pointer" onClick={()=>openEdit(s)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {s.preferred && <Star size={12} fill="currentColor" className="text-amber-500"/>}
                      <span className="font-medium text-sm">{s.business_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TRADE_LABELS[s.trade_category]}</Badge></TableCell>
                  <TableCell><StarRating rating={Number(s.rating_avg)||0} size="sm"/></TableCell>
                  <TableCell className="text-sm">{s.jobs_completed}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.jobs_cancelled}</TableCell>
                  <TableCell>{insuranceBadge(s.insurance_expiry)}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Business Name *</Label>
                <Input value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})}/></div>
              <div><Label className="text-xs">Contact Name</Label>
                <Input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></div>
              <div><Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><Label className="text-xs">Trade *</Label>
                <Select value={form.trade_category} onValueChange={v=>setForm({...form,trade_category:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{TRADES.map(t=><SelectItem key={t} value={t}>{TRADE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">ABN</Label>
                <Input value={form.abn} onChange={e=>setForm({...form,abn:e.target.value})}/></div>
              <div><Label className="text-xs">License Number</Label>
                <Input value={form.license_number} onChange={e=>setForm({...form,license_number:e.target.value})}/></div>
              <div className="col-span-2"><Label className="text-xs">Insurance Expiry</Label>
                <Input type="date" value={form.insurance_expiry} onChange={e=>setForm({...form,insurance_expiry:e.target.value})}/></div>
            </div>
            <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg">
              <div>
                <p className="text-sm font-medium">Preferred supplier</p>
                <p className="text-xs text-muted-foreground">Surfaced first when assigning jobs</p>
              </div>
              <Switch checked={form.preferred} onCheckedChange={v=>setForm({...form,preferred:v})}/>
            </div>
            <div><Label className="text-xs">Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1.5"/>}
              {editing ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
