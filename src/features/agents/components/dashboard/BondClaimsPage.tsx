import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';
import { format } from 'date-fns';
import { Loader2, Plus, ArrowLeft, Scale, AlertTriangle, Copy, FileText, Trash2 } from 'lucide-react';

type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'partial' | 'disputed' | 'closed';

interface ClaimItem {
  id: string;
  room_name: string | null;
  description: string;
  category: string;
  amount: number;
}

interface BondClaim {
  id: string;
  tenancy_id: string | null;
  agent_id: string;
  exit_inspection_id: string | null;
  bond_amount_held: number;
  total_deductions: number;
  claimed_amount: number | null;
  status: ClaimStatus;
  authority_name: string | null;
  authority_reference: string | null;
  lodged_date: string | null;
  outcome_date: string | null;
  outcome_amount: number | null;
  notes: string | null;
  created_at: string;
  tenancies: {
    tenant_name: string | null;
    tenant_email: string | null;
    bond_amount: number | null;
    lease_start: string | null;
    lease_end: string | null;
    properties: {
      address: string | null;
      suburb: string | null;
      state: string | null;
    } | null;
  } | null;
  bond_claim_items: ClaimItem[];
}

interface TenancyOption {
  id: string;
  tenant_name: string | null;
  bond_amount: number | null;
  property_id: string;
  properties: { address: string | null; suburb: string | null; state: string | null } | null;
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-700',
  submitted: 'bg-blue-500/15 text-blue-700',
  approved: 'bg-emerald-500/15 text-emerald-700',
  partial: 'bg-amber-500/15 text-amber-700',
  disputed: 'bg-red-500/15 text-red-700',
  closed: 'bg-muted text-muted-foreground',
};

const CATEGORIES = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'damage', label: 'Damage' },
  { value: 'rent_arrears', label: 'Rent Arrears' },
  { value: 'missing_items', label: 'Missing Items' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const AUTHORITY_BY_STATE: Record<string, string> = {
  VIC: 'Residential Tenancies Bond Authority (RTBA)',
  NSW: 'NSW Fair Trading',
  QLD: 'Residential Tenancies Authority (RTA)',
  WA: 'Consumer Protection WA',
  SA: 'Consumer and Business Services (CBS)',
  ACT: 'ACT Civil and Administrative Tribunal (ACAT)',
  TAS: 'Consumer, Building and Occupational Services',
  NT: 'NT Consumer Affairs',
};

const fmt$ = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const BondClaimsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<BondClaim[]>([]);
  const [tenancies, setTenancies] = useState<TenancyOption[]>([]);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // New claim form
  const [newTenancyId, setNewTenancyId] = useState<string>('');
  const [newBondHeld, setNewBondHeld] = useState<number>(0);
  const [newNotes, setNewNotes] = useState('');

  const [creating, setCreating] = useState(false);

  // Inline new item
  const [itemForm, setItemForm] = useState<{ room: string; category: string; description: string; amount: number } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: agentRow } = await supabase
      .from('agents')
      .select('id, name, agency_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!agentRow) { setLoading(false); return; }
    setAgentId(agentRow.id);
    setAgentName(agentRow.name || '');

    if ((agentRow as any).agency_id) {
      const { data: ag } = await supabase.from('agencies').select('name').eq('id', (agentRow as any).agency_id).maybeSingle();
      if (ag?.name) setAgencyName(ag.name);
    }

    const [claimsRes, tenanciesRes] = await Promise.all([
      supabase
        .from('bond_claims')
        .select(`
          *,
          tenancies:tenancy_id (
            tenant_name, tenant_email, bond_amount, lease_start, lease_end,
            properties:property_id (address, suburb, state)
          ),
          bond_claim_items (id, room_name, description, category, amount)
        `)
        .eq('agent_id', agentRow.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tenancies')
        .select('id, tenant_name, bond_amount, property_id, properties:property_id (address, suburb, state)')
        .eq('agent_id', agentRow.id)
        .order('created_at', { ascending: false }),
    ]);

    setClaims((claimsRes.data || []) as unknown as BondClaim[]);
    setTenancies((tenanciesRes.data || []) as unknown as TenancyOption[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Pre-fill from URL params (?tenancyId=, ?inspectionId=)
  useEffect(() => {
    const tId = searchParams.get('tenancyId');
    const iId = searchParams.get('inspectionId');
    if ((tId || iId) && agentId && !showNew && !openClaimId) {
      if (tId) {
        setNewTenancyId(tId);
        const t = tenancies.find(x => x.id === tId);
        if (t?.bond_amount) setNewBondHeld(Number(t.bond_amount));
      }
      setShowNew(true);
      // Clear so we don't keep re-opening
      const next = new URLSearchParams(searchParams);
      next.delete('tenancyId');
      next.delete('inspectionId');
      setSearchParams(next, { replace: true });
      // store inspectionId to use on create
      if (iId) (window as any).__bondClaimInspectionId = iId;
    }
  }, [agentId, tenancies, searchParams, setSearchParams, showNew, openClaimId]);

  const openClaim = useMemo(() => claims.find(c => c.id === openClaimId) || null, [claims, openClaimId]);

  const handleNewTenancyChange = (id: string) => {
    setNewTenancyId(id);
    const t = tenancies.find(x => x.id === id);
    if (t?.bond_amount) setNewBondHeld(Number(t.bond_amount));
  };

  const createClaim = async () => {
    if (!agentId || !newTenancyId) { toast.error('Select a tenancy'); return; }
    setCreating(true);
    const inspectionId = (window as any).__bondClaimInspectionId as string | undefined;
    const tenancy = tenancies.find(t => t.id === newTenancyId);
    const state = tenancy?.properties?.state?.toUpperCase();
    const authority = state ? AUTHORITY_BY_STATE[state] || null : null;

    const { data, error } = await supabase
      .from('bond_claims')
      .insert({
        agent_id: agentId,
        tenancy_id: newTenancyId,
        exit_inspection_id: inspectionId || null,
        bond_amount_held: newBondHeld || 0,
        notes: newNotes || null,
        authority_name: authority,
        status: 'draft',
      } as any)
      .select('id')
      .maybeSingle();

    setCreating(false);
    if (error || !data) { toast.error('Failed to create claim'); return; }
    delete (window as any).__bondClaimInspectionId;
    setShowNew(false);
    setNewTenancyId(''); setNewBondHeld(0); setNewNotes('');
    toast.success('Claim created');
    await fetchAll();
    setOpenClaimId(data.id);
  };

  const recalcTotal = async (claimId: string, items: ClaimItem[]) => {
    const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const claim = claims.find(c => c.id === claimId);
    const claimed = claim ? Math.min(total, Number(claim.bond_amount_held || 0)) : total;
    await supabase.from('bond_claims').update({ total_deductions: total, claimed_amount: claimed } as any).eq('id', claimId);
  };

  const addItem = async () => {
    if (!itemForm || !openClaim) return;
    if (!itemForm.description.trim()) { toast.error('Description required'); return; }
    const { data, error } = await supabase.from('bond_claim_items').insert({
      claim_id: openClaim.id,
      room_name: itemForm.room || null,
      category: itemForm.category,
      description: itemForm.description,
      amount: itemForm.amount || 0,
    } as any).select('*').maybeSingle();
    if (error || !data) { toast.error('Failed to add item'); return; }
    const newItems = [...openClaim.bond_claim_items, data as ClaimItem];
    setClaims(prev => prev.map(c => c.id === openClaim.id ? { ...c, bond_claim_items: newItems } : c));
    await recalcTotal(openClaim.id, newItems);
    setItemForm(null);
    fetchAll();
  };

  const deleteItem = async (itemId: string) => {
    if (!openClaim) return;
    await supabase.from('bond_claim_items').delete().eq('id', itemId);
    const newItems = openClaim.bond_claim_items.filter(i => i.id !== itemId);
    setClaims(prev => prev.map(c => c.id === openClaim.id ? { ...c, bond_claim_items: newItems } : c));
    await recalcTotal(openClaim.id, newItems);
    fetchAll();
  };

  const updateClaim = async (patch: Partial<BondClaim>) => {
    if (!openClaim) return;
    await supabase.from('bond_claims').update(patch as any).eq('id', openClaim.id);
    setClaims(prev => prev.map(c => c.id === openClaim.id ? { ...c, ...patch } as BondClaim : c));
  };

  // ---- Summary text generator ----
  const summaryText = useMemo(() => {
    if (!openClaim) return '';
    const t = openClaim.tenancies;
    const prop = t?.properties;
    const itemLines = openClaim.bond_claim_items.map(i =>
      `• ${CATEGORY_LABEL[i.category] || i.category} — ${i.description}${i.room_name ? ` (${i.room_name})` : ''}: ${fmt$(Number(i.amount))}`
    ).join('\n');
    const claimed = Number(openClaim.claimed_amount || 0);
    const remaining = Number(openClaim.bond_amount_held || 0) - claimed;
    return [
      'Bond Claim Summary',
      `Date: ${format(new Date(), 'dd MMM yyyy')}`,
      `Authority: ${openClaim.authority_name || '—'}`,
      `Tenant: ${t?.tenant_name || '—'}`,
      `Property: ${[prop?.address, prop?.suburb, prop?.state].filter(Boolean).join(', ')}`,
      `Tenancy Period: ${t?.lease_start || '—'} to ${t?.lease_end || '—'}`,
      `Bond Held: ${fmt$(Number(openClaim.bond_amount_held))}`,
      '',
      'Deduction Items:',
      itemLines || '(none)',
      '',
      `Total Claimed: ${fmt$(claimed)}`,
      `Remaining to Tenant: ${fmt$(remaining)}`,
      '',
      `Regards,`,
      agentName,
      agencyName,
    ].join('\n');
  }, [openClaim, agentName, agencyName]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Summary copied');
    } catch { toast.error('Copy failed'); }
  };

  // ===== RENDER =====
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  // ----- DETAIL VIEW -----
  if (openClaim) {
    const total = openClaim.bond_claim_items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const overBond = total > Number(openClaim.bond_amount_held || 0);
    const overAmount = total - Number(openClaim.bond_amount_held || 0);
    const t = openClaim.tenancies;
    const prop = t?.properties;
    const propAddr = [prop?.address, prop?.suburb, prop?.state].filter(Boolean).join(', ');

    return (
      <div className="space-y-4 pb-20">
        <DashboardHeader
          title={`Bond Claim — ${t?.tenant_name || 'Tenant'}`}
          subtitle={propAddr}
          actions={
            <Button variant="ghost" size="sm" onClick={() => setOpenClaimId(null)}>
              <ArrowLeft size={14} className="mr-1" /> Back to claims
            </Button>
          }
        />

        {/* 1. SUMMARY */}
        <Card className="mx-4 sm:mx-6">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Bond Held</p>
              <p className="font-semibold">{fmt$(Number(openClaim.bond_amount_held))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deductions</p>
              <p className="font-semibold">{fmt$(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Claimed Amount</p>
              <p className="font-semibold">{fmt$(Number(openClaim.claimed_amount || 0))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={cn('border-0 capitalize', STATUS_COLORS[openClaim.status])}>{openClaim.status}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 2. DEDUCTION ITEMS */}
        <Card className="mx-4 sm:mx-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Deduction Items</h2>
              {!itemForm && (
                <Button size="sm" variant="outline" onClick={() => setItemForm({ room: '', category: 'cleaning', description: '', amount: 0 })}>
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
              )}
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium py-2 px-2">Room</th>
                    <th className="text-left font-medium py-2 px-2">Category</th>
                    <th className="text-left font-medium py-2 px-2">Description</th>
                    <th className="text-right font-medium py-2 px-2">Amount</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {openClaim.bond_claim_items.map(item => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2 px-2">{item.room_name || '—'}</td>
                      <td className="py-2 px-2">{CATEGORY_LABEL[item.category] || item.category}</td>
                      <td className="py-2 px-2">{item.description}</td>
                      <td className="py-2 px-2 text-right font-medium">{fmt$(Number(item.amount))}</td>
                      <td className="py-2 px-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem(item.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {itemForm && (
                    <tr className="border-b border-border/50 bg-accent/20">
                      <td className="py-2 px-2">
                        <Input className="h-8 text-xs" placeholder="Room (optional)" value={itemForm.room} onChange={e => setItemForm({ ...itemForm, room: e.target.value })} />
                      </td>
                      <td className="py-2 px-2">
                        <Select value={itemForm.category} onValueChange={v => setItemForm({ ...itemForm, category: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-2">
                        <Input className="h-8 text-xs" placeholder="Description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" min={0} step="0.01" className="h-8 text-xs text-right" value={itemForm.amount} onChange={e => setItemForm({ ...itemForm, amount: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={addItem}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setItemForm(null)}>Cancel</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {openClaim.bond_claim_items.length === 0 && !itemForm && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No deduction items yet.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="py-2 px-2 text-right font-semibold">Total Deductions:</td>
                    <td className="py-2 px-2 text-right font-semibold">{fmt$(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {overBond && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Deductions exceed bond held by {fmt$(overAmount)} — you can only claim up to the bond amount without a tribunal application.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Claim Amount</Label>
              <Input
                type="number" min={0} step="0.01"
                value={openClaim.claimed_amount ?? Math.min(total, Number(openClaim.bond_amount_held || 0))}
                onChange={e => updateClaim({ claimed_amount: parseFloat(e.target.value) || 0 })}
                className="max-w-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. AUTHORITY */}
        <Card className="mx-4 sm:mx-6">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Authority Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Authority</Label>
                <Input value={openClaim.authority_name || ''} onChange={e => updateClaim({ authority_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Authority Reference</Label>
                <Input value={openClaim.authority_reference || ''} onChange={e => updateClaim({ authority_reference: e.target.value })} placeholder="e.g. RTBA-12345" />
              </div>
              <div>
                <Label className="text-xs">Lodged Date</Label>
                <Input type="date" value={openClaim.lodged_date || ''} onChange={e => updateClaim({ lodged_date: e.target.value || null })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={openClaim.notes || ''} onChange={e => updateClaim({ notes: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. SUMMARY GENERATOR */}
        <Card className="mx-4 sm:mx-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Claim Letter</h2>
              <Button size="sm" variant="outline" onClick={() => setShowSummary(true)}>
                <FileText size={14} className="mr-1" /> Generate Claim Summary
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. STATUS MGMT */}
        <Card className="mx-4 sm:mx-6">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Claim Status</Label>
                <Select value={openClaim.status} onValueChange={v => updateClaim({ status: v as ClaimStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="partial">Partially Approved</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(openClaim.status === 'approved' || openClaim.status === 'partial') && (
                <>
                  <div>
                    <Label className="text-xs">Outcome Amount</Label>
                    <Input type="number" min={0} step="0.01" value={openClaim.outcome_amount ?? ''} onChange={e => updateClaim({ outcome_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label className="text-xs">Outcome Date</Label>
                    <Input type="date" value={openClaim.outcome_date || ''} onChange={e => updateClaim({ outcome_date: e.target.value || null })} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary dialog */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Claim Summary</DialogTitle></DialogHeader>
            <Textarea readOnly value={summaryText} rows={18} className="font-mono text-xs" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSummary(false)}>Close</Button>
              <Button onClick={copySummary}><Copy size={14} className="mr-1" /> Copy Summary</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ----- LIST VIEW -----
  const draftCount = claims.filter(c => c.status === 'draft').length;
  const submittedCount = claims.filter(c => ['submitted', 'approved', 'partial', 'disputed'].includes(c.status)).length;
  const recovered = claims
    .filter(c => c.status === 'approved' || c.status === 'partial')
    .reduce((s, c) => s + Number(c.outcome_amount || 0), 0);

  return (
    <div className="space-y-4 pb-20">
      <DashboardHeader
        title="Bond Claims"
        subtitle="Track bond deductions and claims with authorities"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} className="mr-1" /> New Bond Claim
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Draft Claims</p>
          <p className="text-2xl font-semibold">{draftCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-2xl font-semibold">{submittedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Recovered</p>
          <p className="text-2xl font-semibold">{fmt$(recovered)}</p>
        </CardContent></Card>
      </div>

      {/* List */}
      <div className="px-4 sm:px-6 space-y-2">
        {claims.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Scale className="mx-auto mb-2 text-muted-foreground" size={28} />
            <p className="text-sm">No bond claims yet.</p>
          </CardContent></Card>
        ) : claims.map(c => {
          const total = c.bond_claim_items.reduce((s, i) => s + Number(i.amount || 0), 0);
          const prop = c.tenancies?.properties;
          return (
            <Card key={c.id} className="hover:shadow-sm transition">
              <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.tenancies?.tenant_name || 'Tenant'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[prop?.address, prop?.suburb, prop?.state].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bond: <span className="text-foreground font-medium">{fmt$(Number(c.bond_amount_held))}</span>
                    {' · '}Claimed: <span className="text-foreground font-medium">{fmt$(total)}</span>
                    {c.authority_name && <> · {c.authority_name}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn('border-0 capitalize', STATUS_COLORS[c.status])}>{c.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setOpenClaimId(c.id)}>Open Claim</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New claim modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Bond Claim</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tenancy</Label>
              <Select value={newTenancyId} onValueChange={handleNewTenancyChange}>
                <SelectTrigger><SelectValue placeholder="Select tenancy" /></SelectTrigger>
                <SelectContent>
                  {tenancies.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.tenant_name || 'Tenant'} — {t.properties?.address || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bond Amount Held ($)</Label>
              <Input type="number" min={0} step="0.01" value={newBondHeld} onChange={e => setNewBondHeld(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={3} value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)} disabled={creating}>Cancel</Button>
            <Button onClick={createClaim} disabled={creating || !newTenancyId}>
              {creating ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              Create Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BondClaimsPage;
