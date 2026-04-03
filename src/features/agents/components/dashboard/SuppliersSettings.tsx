import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  agent_id: string;
  supplier_name: string;
  company_name: string | null;
  email: string;
  service_type: string;
  is_active: boolean;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  signboard: 'Signboard',
  photography: 'Photography',
  both: 'Both',
};

const SuppliersSettings = () => {
  const agentId = useAgentId();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplier_name: '',
    company_name: '',
    email: '',
    service_type: 'both',
  });

  const loadSuppliers = async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('agent_suppliers' as any)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    setSuppliers((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadSuppliers(); }, [agentId]);

  const openAdd = () => {
    setEditing(null);
    setForm({ supplier_name: '', company_name: '', email: '', service_type: 'both' });
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      supplier_name: s.supplier_name,
      company_name: s.company_name || '',
      email: s.email,
      service_type: s.service_type,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.supplier_name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!agentId) return;
    setSaving(true);

    const payload = {
      agent_id: agentId,
      supplier_name: form.supplier_name.trim(),
      company_name: form.company_name.trim() || null,
      email: form.email.trim(),
      service_type: form.service_type,
    };

    if (editing) {
      const { error } = await supabase
        .from('agent_suppliers' as any)
        .update(payload)
        .eq('id', editing.id);
      if (error) toast.error('Failed to update');
      else toast.success('Supplier updated');
    } else {
      const { error } = await supabase
        .from('agent_suppliers' as any)
        .insert(payload);
      if (error) toast.error('Failed to add supplier');
      else toast.success('Supplier added');
    }

    setSaving(false);
    setShowForm(false);
    loadSuppliers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('agent_suppliers' as any)
      .delete()
      .eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Supplier removed');
      loadSuppliers();
    }
  };

  const toggleActive = async (s: Supplier) => {
    await supabase
      .from('agent_suppliers' as any)
      .update({ is_active: !s.is_active })
      .eq('id', s.id);
    loadSuppliers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Package size={14} /> Marketing Suppliers
          </h3>
          <p className="text-xs text-muted-foreground">
            Add signboard, photography, or marketing suppliers to notify when you list a property.
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5 text-xs">
          <Plus size={14} /> Add Supplier
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <Package size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No suppliers added yet</p>
          <Button size="sm" variant="outline" onClick={openAdd} className="mt-3 text-xs">
            Add your first supplier
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{s.supplier_name}</span>
                  {s.company_name && (
                    <span className="text-xs text-muted-foreground">· {s.company_name}</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {SERVICE_LABELS[s.service_type] || s.service_type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={s.is_active}
                  onCheckedChange={() => toggleActive(s)}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Pencil size={13} />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Supplier Name *</Label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm(p => ({ ...p, supplier_name: e.target.value }))}
                placeholder="e.g. John Smith"
              />
            </div>
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="e.g. Quick Signs Pty Ltd"
              />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <Label className="text-xs">Service Type</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm(p => ({ ...p, service_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signboard">Signboard</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
              {editing ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersSettings;
