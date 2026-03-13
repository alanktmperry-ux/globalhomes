import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/hooks/useContacts';

interface Props {
  onClose: () => void;
  onSave: (data: Partial<Contact>) => Promise<void>;
  initialData?: Partial<Contact>;
}

const ContactFormModal = ({ onClose, onSave, initialData }: Props) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    mobile: initialData?.mobile || '',
    contact_type: initialData?.contact_type || 'buyer',
    ranking: initialData?.ranking || 'cold',
    suburb: initialData?.suburb || '',
    state: initialData?.state || '',
    postcode: initialData?.postcode || '',
    budget_min: initialData?.budget_min || '',
    budget_max: initialData?.budget_max || '',
    preferred_beds: initialData?.preferred_beds || '',
    preferred_baths: initialData?.preferred_baths || '',
    property_address: initialData?.property_address || '',
    estimated_value: initialData?.estimated_value || '',
    source: initialData?.source || '',
    notes: initialData?.notes || '',
  });

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        budget_min: form.budget_min ? Math.max(0, Number(form.budget_min)) : null,
        budget_max: form.budget_max ? Math.max(0, Number(form.budget_max)) : null,
        preferred_beds: form.preferred_beds ? Math.max(0, Number(form.preferred_beds)) : null,
        preferred_baths: form.preferred_baths ? Math.max(0, Number(form.preferred_baths)) : null,
        estimated_value: form.estimated_value ? Math.max(0, Number(form.estimated_value)) : null,
      } as any);
      toast({ title: '✅ Contact saved', description: `${form.first_name} ${form.last_name}`.trim() });
      onClose();
    } catch (err: any) {
      toast({
        title: '❌ Failed to save contact',
        description: err?.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.contact_type} onValueChange={v => setForm(f => ({...f, contact_type: v}))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="both">Both (Buyer & Seller)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ranking</Label>
              <Select value={form.ranking} onValueChange={v => setForm(f => ({...f, ranking: v}))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="warm">🌡️ Warm</SelectItem>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="h-9" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Mobile</Label>
            <Input value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} className="h-9" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Suburb</Label>
              <Input value={form.suburb} onChange={e => setForm(f => ({...f, suburb: e.target.value}))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Select value={form.state} onValueChange={v => setForm(f => ({...f, state: v}))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Postcode</Label>
              <Input value={form.postcode} onChange={e => setForm(f => ({...f, postcode: e.target.value}))} className="h-9" />
            </div>
          </div>

          {(form.contact_type === 'buyer' || form.contact_type === 'both') && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Buyer Preferences</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Budget Min ($)</Label>
                  <Input type="number" value={form.budget_min} onChange={e => setForm(f => ({...f, budget_min: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Budget Max ($)</Label>
                  <Input type="number" value={form.budget_max} onChange={e => setForm(f => ({...f, budget_max: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Bedrooms</Label>
                  <Input type="number" value={form.preferred_beds} onChange={e => setForm(f => ({...f, preferred_beds: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Bathrooms</Label>
                  <Input type="number" value={form.preferred_baths} onChange={e => setForm(f => ({...f, preferred_baths: e.target.value}))} className="h-9" />
                </div>
              </div>
            </div>
          )}

          {(form.contact_type === 'seller' || form.contact_type === 'both') && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Seller Property</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Property Address</Label>
                  <Input value={form.property_address} onChange={e => setForm(f => ({...f, property_address: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Estimated Value ($)</Label>
                  <Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({...f, estimated_value: e.target.value}))} className="h-9" />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Source</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({...f, source: v}))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="open_home">Open Home</SelectItem>
                <SelectItem value="cold_call">Cold Call</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="csv_import">CSV Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.first_name.trim() || saving}>
              {saving ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormModal;
