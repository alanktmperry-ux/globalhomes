import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Building2, Users, MessageSquare, Plus, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StrataSchemeCard } from '../components/StrataSchemeCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const BUILDING_TYPES = ['Residential', 'Mixed Use', 'Commercial', 'Serviced Apartments'];

export default function StrataDashboardLayout() {
  const { user } = useAuth();
  const [showAddScheme, setShowAddScheme] = useState(false);

  // Get strata manager record
  const { data: manager, isLoading: managerLoading } = useQuery({
    queryKey: ['strata-manager', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('strata_managers')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Get schemes
  const { data: schemes = [], refetch: refetchSchemes } = useQuery({
    queryKey: ['strata-schemes-mine', manager?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('strata_schemes')
        .select('*')
        .eq('strata_manager_id', manager!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!manager?.id,
  });

  const totalLots = schemes.reduce((sum, s) => sum + (s.total_lots || 0), 0);

  if (managerLoading) return (
    <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>
  );

  return (
    <>
      <Helmet><title>Strata Dashboard</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Strata Dashboard</h1>
          <Dialog open={showAddScheme} onOpenChange={setShowAddScheme}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-1" /> Add Scheme</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Strata Scheme</DialogTitle></DialogHeader>
              <AddSchemeForm managerId={manager?.id || ''} onSuccess={() => { setShowAddScheme(false); refetchSchemes(); }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Building2 className="text-primary" size={20} />
            <div><p className="text-xs text-muted-foreground">Schemes Managed</p><p className="text-xl font-bold">{schemes.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="text-primary" size={20} />
            <div><p className="text-xs text-muted-foreground">Total Lots</p><p className="text-xl font-bold">{totalLots}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="text-primary" size={20} />
            <div><p className="text-xs text-muted-foreground">Enquiries</p><p className="text-xl font-bold">—</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="schemes">
          <TabsList>
            <TabsTrigger value="schemes">My Schemes</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="schemes">
            {schemes.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No schemes yet. Click "Add Scheme" to get started.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {schemes.map(s => <StrataSchemeCard key={s.id} scheme={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            {manager && <ManagerProfileForm manager={manager} />}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function AddSchemeForm({ managerId, onSuccess }: { managerId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    scheme_name: '', address: '', suburb: '', state: 'NSW', postcode: '',
    total_lots: 1, year_built: '', building_type: 'Residential',
    admin_fund_levy_per_lot: '', capital_works_levy_per_lot: '',
    sinking_fund_balance: '', sinking_fund_target: '',
  });

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('strata_schemes').insert({
      strata_manager_id: managerId,
      scheme_name: form.scheme_name,
      address: form.address,
      suburb: form.suburb,
      state: form.state,
      postcode: form.postcode,
      total_lots: Number(form.total_lots),
      year_built: form.year_built ? Number(form.year_built) : null,
      building_type: form.building_type,
      admin_fund_levy_per_lot: form.admin_fund_levy_per_lot ? Number(form.admin_fund_levy_per_lot) : null,
      capital_works_levy_per_lot: form.capital_works_levy_per_lot ? Number(form.capital_works_levy_per_lot) : null,
      sinking_fund_balance: form.sinking_fund_balance ? Number(form.sinking_fund_balance) : null,
      sinking_fund_target: form.sinking_fund_target ? Number(form.sinking_fund_target) : null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Scheme added');
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Scheme Name *</Label><Input required value={form.scheme_name} onChange={e => update('scheme_name', e.target.value)} /></div>
      <div><Label>Address *</Label><Input required value={form.address} onChange={e => update('address', e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Suburb *</Label><Input required value={form.suburb} onChange={e => update('suburb', e.target.value)} /></div>
        <div><Label>State *</Label>
          <Select value={form.state} onValueChange={v => update('state', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Postcode *</Label><Input required value={form.postcode} onChange={e => update('postcode', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Total Lots *</Label><Input type="number" min={1} required value={form.total_lots} onChange={e => update('total_lots', e.target.value)} /></div>
        <div><Label>Year Built</Label><Input type="number" value={form.year_built} onChange={e => update('year_built', e.target.value)} /></div>
        <div><Label>Building Type</Label>
          <Select value={form.building_type} onValueChange={v => update('building_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUILDING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Admin Levy ($/lot/qtr)</Label><Input type="number" step="0.01" value={form.admin_fund_levy_per_lot} onChange={e => update('admin_fund_levy_per_lot', e.target.value)} /></div>
        <div><Label>Capital Works Levy ($/lot/qtr)</Label><Input type="number" step="0.01" value={form.capital_works_levy_per_lot} onChange={e => update('capital_works_levy_per_lot', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Sinking Fund Balance ($)</Label><Input type="number" step="0.01" value={form.sinking_fund_balance} onChange={e => update('sinking_fund_balance', e.target.value)} /></div>
        <div><Label>Sinking Fund Target ($)</Label><Input type="number" step="0.01" value={form.sinking_fund_target} onChange={e => update('sinking_fund_target', e.target.value)} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Add Scheme'}</Button>
    </form>
  );
}

function ManagerProfileForm({ manager }: { manager: any }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: manager.company_name || '',
    phone: manager.phone || '',
    website: manager.website || '',
    bio: manager.bio || '',
  });

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('strata_managers').update(form).eq('id', manager.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
  };

  return (
    <div className="max-w-md space-y-3 mt-4">
      <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
      <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
      <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
      <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
    </div>
  );
}
