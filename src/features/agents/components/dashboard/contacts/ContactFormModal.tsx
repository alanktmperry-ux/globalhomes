import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';
import { autocomplete, getPlaceDetails } from '@/lib/googleMapsService';
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
    phone: initialData?.phone || initialData?.mobile || '',
    contact_type: initialData?.contact_type || 'buyer',
    ranking: initialData?.ranking || 'cold',
    // Address fields - auto-filled by Google Places
    address: initialData?.address || '',
    suburb: initialData?.suburb || '',
    state: initialData?.state || '',
    postcode: initialData?.postcode || '',
    country: initialData?.country || '',
    budget_min: initialData?.budget_min || '',
    budget_max: initialData?.budget_max || '',
    preferred_beds: initialData?.preferred_beds || '',
    preferred_baths: initialData?.preferred_baths || '',
    property_address: initialData?.property_address || '',
    estimated_value: initialData?.estimated_value || '',
    source: initialData?.source || '',
    notes: initialData?.notes || '',
  });

  // Google Places autocomplete state
  const [addressQuery, setAddressQuery] = useState(
    [initialData?.address, initialData?.suburb, initialData?.state, initialData?.postcode, initialData?.country]
      .filter(Boolean)
      .join(', ') || ''
  );
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Autocomplete debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (addressQuery.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(addressQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [addressQuery]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = useCallback(async (suggestion: { description: string; place_id: string }) => {
    setAddressQuery(suggestion.description);
    setShowSuggestions(false);

    const details = await getPlaceDetails(suggestion.place_id);
    if (!details) return;

    // Parse address components from the description
    // The full address is in suggestion.description; details gives us lat/lng
    // We need to call geocode to get structured address components
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.functions.invoke('google-maps-proxy', {
        body: { action: 'place_details', input: suggestion.place_id },
      });

      if (data?.result?.address_components) {
        const components = data.result.address_components as { long_name: string; short_name: string; types: string[] }[];
        const get = (type: string) => components.find(c => c.types.includes(type));

        const streetNumber = get('street_number')?.long_name || '';
        const route = get('route')?.long_name || '';
        const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

        setForm(f => ({
          ...f,
          address: streetAddress || suggestion.description,
          suburb: get('locality')?.long_name || get('sublocality')?.long_name || get('postal_town')?.long_name || '',
          state: get('administrative_area_level_1')?.short_name || '',
          postcode: get('postal_code')?.long_name || '',
          country: get('country')?.long_name || '',
        }));
      }
    } catch {
      // Fallback: just set the full address
      setForm(f => ({ ...f, address: suggestion.description }));
    }
  }, []);

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        mobile: form.phone, // sync mobile with phone for backwards compat
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
              <Label className="text-xs">Mobile Phone</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="h-9" placeholder="+61 400 000 000" />
            </div>
          </div>

          {/* Google Places address autocomplete */}
          <div ref={wrapperRef} className="relative">
            <Label className="text-xs">Address</Label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Start typing an address…"
                className="h-9 pl-8"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-y-auto max-h-48">
                {suggestions.map((s) => (
                  <li key={s.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPlace(s)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <MapPin size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{s.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* Show parsed address details */}
            {(form.suburb || form.state || form.country) && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {form.suburb && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.suburb}</span>}
                {form.state && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.state}</span>}
                {form.postcode && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.postcode}</span>}
                {form.country && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.country}</span>}
              </div>
            )}
          </div>

          {(form.contact_type === 'buyer' || form.contact_type === 'both') && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Buyer Preferences</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Budget Min ($)</Label>
                  <Input type="number" min="0" value={form.budget_min} onChange={e => setForm(f => ({...f, budget_min: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Budget Max ($)</Label>
                  <Input type="number" min="0" value={form.budget_max} onChange={e => setForm(f => ({...f, budget_max: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Bedrooms</Label>
                  <Input type="number" min="0" max="20" value={form.preferred_beds} onChange={e => setForm(f => ({...f, preferred_beds: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Bathrooms</Label>
                  <Input type="number" min="0" max="20" value={form.preferred_baths} onChange={e => setForm(f => ({...f, preferred_baths: e.target.value}))} className="h-9" />
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
                  <Input type="number" min="0" value={form.estimated_value} onChange={e => setForm(f => ({...f, estimated_value: e.target.value}))} className="h-9" />
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
