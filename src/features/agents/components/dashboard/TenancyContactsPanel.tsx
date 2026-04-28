import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown, ChevronUp, Plus, Edit, Trash2, Mail, Phone, CalendarIcon, ShieldCheck, Loader2, Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/shared/lib/utils';

type ContactType = 'primary_tenant' | 'co_tenant' | 'emergency_contact' | 'guarantor';

interface TenancyContact {
  id: string;
  tenancy_id: string;
  contact_type: ContactType;
  name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  id_verified: boolean;
  notes: string | null;
  created_at: string;
}

interface Props {
  tenancyId: string;
  readOnly?: boolean;
}

const TYPE_META: Record<ContactType, { label: string; addLabel: string; max?: number }> = {
  primary_tenant: { label: 'Primary Tenant', addLabel: 'Add Primary Tenant', max: 1 },
  co_tenant: { label: 'Co-Tenants', addLabel: 'Add Co-Tenant' },
  emergency_contact: { label: 'Emergency Contacts', addLabel: 'Add Emergency Contact' },
  guarantor: { label: 'Guarantors', addLabel: 'Add Guarantor' },
};

const TYPE_ORDER: ContactType[] = ['primary_tenant', 'co_tenant', 'emergency_contact', 'guarantor'];

interface FormState {
  id?: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth?: Date;
  notes: string;
}

const emptyForm = (): FormState => ({ name: '', email: '', phone: '', notes: '' });

export default function TenancyContactsPanel({ tenancyId, readOnly = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<TenancyContact[]>([]);
  const [collapsed, setCollapsed] = useState<Record<ContactType, boolean>>({
    primary_tenant: false,
    co_tenant: false,
    emergency_contact: false,
    guarantor: false,
  });
  const [editing, setEditing] = useState<{ type: ContactType; form: FormState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TenancyContact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenancy_contacts' as any)
      .select('*')
      .eq('tenancy_id', tenancyId)
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Could not load contacts');
      setContacts([]);
    } else {
      setContacts((data as any) || []);
    }
    setLoading(false);
  }, [tenancyId]);

  useEffect(() => { load(); }, [load]);

  const grouped = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = contacts.filter(c => c.contact_type === t);
    return acc;
  }, {} as Record<ContactType, TenancyContact[]>);

  const openAdd = (type: ContactType) => {
    setEditing({ type, form: emptyForm() });
  };
  const openEdit = (c: TenancyContact) => {
    setEditing({
      type: c.contact_type,
      form: {
        id: c.id,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        date_of_birth: c.date_of_birth ? parseISO(c.date_of_birth) : undefined,
        notes: c.notes || '',
      },
    });
  };

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    const payload: any = {
      tenancy_id: tenancyId,
      contact_type: editing.type,
      name: f.name.trim(),
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      date_of_birth: f.date_of_birth ? format(f.date_of_birth, 'yyyy-MM-dd') : null,
      notes: f.notes.trim() || null,
    };
    let error;
    if (f.id) {
      ({ error } = await supabase.from('tenancy_contacts' as any).update(payload).eq('id', f.id));
    } else {
      ({ error } = await supabase.from('tenancy_contacts' as any).insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error('Could not save contact');
      return;
    }
    toast.success('Contact saved');
    setEditing(null);
    load();
  };

  const toggleVerified = async (c: TenancyContact, value: boolean) => {
    const { error } = await supabase
      .from('tenancy_contacts' as any)
      .update({ id_verified: value })
      .eq('id', c.id);
    if (error) {
      toast.error('Could not update');
      return;
    }
    setContacts(prev => prev.map(p => p.id === c.id ? { ...p, id_verified: value } : p));
  };

  const remove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase
      .from('tenancy_contacts' as any)
      .delete()
      .eq('id', removeTarget.id);
    if (error) {
      toast.error('Could not remove contact');
      return;
    }
    toast.success('Contact removed');
    setRemoveTarget(null);
    load();
  };

  const renderContactCard = (c: TenancyContact) => (
    <div key={c.id} className="rounded-lg border border-border/50 p-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-sm">{c.name}</div>
            {c.id_verified && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                <ShieldCheck size={10} className="mr-1" /> Verified
              </Badge>
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Mail size={11} /> {c.email}
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Phone size={11} /> {c.phone}
              </a>
            )}
            {c.date_of_birth && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon size={11} /> {format(parseISO(c.date_of_birth), 'dd MMM yyyy')}
              </div>
            )}
            {c.notes && <div className="pt-1 italic">{c.notes}</div>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)} aria-label="Edit">
                <Edit size={13} />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setRemoveTarget(c)} aria-label="Remove">
                <Trash2 size={13} />
              </Button>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={c.id_verified}
                onCheckedChange={(v) => toggleVerified(c, !!v)}
              />
              ID Verified
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Tenants & Contacts</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {TYPE_ORDER.map(type => {
              const items = grouped[type];
              const meta = TYPE_META[type];
              const isCollapsed = collapsed[type];
              const canAddMore = !meta.max || items.length < meta.max;
              return (
                <div key={type} className="rounded-lg border border-border/50">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/40 rounded-t-lg"
                    onClick={() => setCollapsed(s => ({ ...s, [type]: !s[type] }))}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meta.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </div>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  {!isCollapsed && (
                    <div className="p-3 pt-0 space-y-2">
                      {items.length === 0 && (
                        <div className="text-xs text-muted-foreground py-2">No {meta.label.toLowerCase()} added.</div>
                      )}
                      {items.map(renderContactCard)}
                      {!readOnly && canAddMore && (
                        <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => openAdd(type)}>
                          <Plus size={14} className="mr-1" /> {meta.addLabel}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Modal */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing?.form.id ? 'Edit ' : 'Add '}
                {editing ? TYPE_META[editing.type].label.replace(/s$/, '') : ''}
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={editing.form.name}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editing.form.email}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, email: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={editing.form.phone}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, phone: e.target.value } })}
                  />
                </div>
                <div className="flex flex-col">
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal mt-1',
                          !editing.form.date_of_birth && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editing.form.date_of_birth
                          ? format(editing.form.date_of_birth, 'dd MMM yyyy')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editing.form.date_of_birth}
                        onSelect={(d) => setEditing({ ...editing, form: { ...editing.form, date_of_birth: d || undefined } })}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={editing.form.notes}
                    onChange={e => setEditing({ ...editing, form: { ...editing.form, notes: e.target.value } })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 size={14} className="mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete */}
        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove contact?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove {removeTarget?.name} from this tenancy? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
