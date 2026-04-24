import { useState, useRef, useEffect, useCallback } from 'react';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { MapPin, X, Plus, Search } from 'lucide-react';
import { autocomplete, getPlaceDetails } from '@/shared/lib/googleMapsService';
import ContactLanguagePicker from '@/shared/components/ContactLanguagePicker';
import { DEFAULT_CONTACT_LANGUAGE } from '@/shared/lib/contactLanguages';
import CommunicationPreferencesEditor from '@/shared/components/CommunicationPreferences/CommunicationPreferencesEditor';
import { isValidHandle, type CommPreference } from '@/shared/components/CommunicationPreferences/types';
import { useAuth } from '@/features/auth/AuthProvider';
import DuplicateMatchPanel from '@/shared/components/DuplicateDetection/DuplicateMatchPanel';
import { useDuplicateMatches } from '@/shared/components/DuplicateDetection/useDuplicateMatches';
import { logDuplicateEvent } from '@/shared/components/DuplicateDetection/useDuplicateMatches';
import type { DuplicateMatch } from '@/shared/components/DuplicateDetection/types';
import type { Contact } from '@/features/agents/hooks/useContacts';

interface Props {
  onClose: () => void;
  onSave: (data: Partial<Contact>) => Promise<void>;
  initialData?: Partial<Contact>;
  /** Optional dialog title override (e.g. "Add New Lead" when used in lead context) */
  title?: string;
  /** Optional save button label override */
  saveLabel?: string;
  /** Optional extra panel rendered between Source and Notes — used by LeadContactForm */
  leadPanel?: React.ReactNode;
}

interface SuburbPickerProps {
  suburbs: string[];
  onChange: (suburbs: string[]) => void;
}

function SuburbPicker({ suburbs, onChange }: SuburbPickerProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(query + ' Australia');
      setSuggestions(results.slice(0, 6));
      setShowSuggestions(results.length > 0);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const extractSuburb = (description: string): string => {
    const parts = description.split(',');
    const first = parts[0].trim();
    return first.replace(/\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}$/, '').trim();
  };

  const addSuburb = (label: string) => {
    const clean = extractSuburb(label);
    if (!clean) return;
    const normalised = clean.replace(/\b\w/g, c => c.toUpperCase());
    if (!suburbs.includes(normalised)) {
      onChange([...suburbs, normalised]);
    }
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const addFreeText = () => {
    const clean = query.trim();
    if (!clean) return;
    const normalised = clean.replace(/\b\w/g, c => c.toUpperCase());
    if (!suburbs.includes(normalised)) {
      onChange([...suburbs, normalised]);
    }
    setQuery('');
    inputRef.current?.focus();
  };

  const removeSuburb = (suburb: string) => {
    onChange(suburbs.filter(s => s !== suburb));
  };

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      {suburbs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suburbs.map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              <MapPin size={10} />
              {s}
              <button onClick={() => removeSuburb(s)} className="ml-0.5 hover:text-destructive transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 bg-background focus-within:ring-1 focus-within:ring-ring">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addFreeText(); }
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            placeholder="Type suburb or search…"
            className="flex-1 text-[13px] bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query.trim() && (
            <button onClick={addFreeText} className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-0.5">
              <Plus size={12} />
              Add
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-y-auto max-h-48">
            {suggestions.map(s => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onClick={() => addSuburb(s.description)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-foreground hover:bg-accent transition-colors"
                >
                  <MapPin size={12} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{s.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Type and press Enter, or pick from suggestions. Add as many areas as needed.
      </p>
    </div>
  );
}

const ContactFormModal = ({ onClose, onSave, initialData, title, saveLabel, leadPanel }: Props) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { agencyId } = useAuth();
  const [showDupBlock, setShowDupBlock] = useState(false);
  const [form, setForm] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || initialData?.mobile || '',
    contact_type: initialData?.contact_type || 'buyer',
    ranking: initialData?.ranking || 'cold',
    address: initialData?.address || '',
    suburb: initialData?.suburb || '',
    state: initialData?.state || '',
    postcode: initialData?.postcode || '',
    country: initialData?.country || '',
    preferred_suburbs: (initialData?.preferred_suburbs as string[]) || [],
    budget_min: initialData?.budget_min || '',
    budget_max: initialData?.budget_max || '',
    preferred_beds: initialData?.preferred_beds || '',
    preferred_baths: initialData?.preferred_baths || '',
    property_address: initialData?.property_address || '',
    estimated_value: initialData?.estimated_value || '',
    source: initialData?.source || '',
    notes: initialData?.notes || '',
    preferred_language: (initialData as any)?.preferred_language || DEFAULT_CONTACT_LANGUAGE,
  });

  const [commPrefs, setCommPrefs] = useState<CommPreference[]>(
    (initialData?.communication_preferences as CommPreference[] | undefined) ?? []
  );

  // Live duplicate detection — only when creating, not editing
  const isEditing = Boolean((initialData as any)?.id);
  const { matches: duplicateMatches } = useDuplicateMatches({
    agencyId,
    enabled: !isEditing,
    excludeContactId: (initialData as any)?.id ?? null,
    query: {
      email: form.email,
      phone: form.phone,
      firstName: form.first_name,
      lastName: form.last_name,
      address: form.address,
    },
  });

  const [addressQuery, setAddressQuery] = useState(
    [initialData?.address, initialData?.suburb, initialData?.state, initialData?.postcode, initialData?.country]
      .filter(Boolean).join(', ') || ''
  );
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        setForm(f => ({
          ...f,
          address: [streetNumber, route].filter(Boolean).join(' ') || suggestion.description,
          suburb: get('locality')?.long_name || get('sublocality')?.long_name || get('postal_town')?.long_name || '',
          state: get('administrative_area_level_1')?.short_name || '',
          postcode: get('postal_code')?.long_name || '',
          country: get('country')?.long_name || '',
        }));
      }
    } catch {
      setForm(f => ({ ...f, address: suggestion.description }));
    }
  }, []);

  const isBuyer = form.contact_type === 'buyer' || form.contact_type === 'both';
  const isSeller = form.contact_type === 'seller' || form.contact_type === 'both';

  // "Use this contact" → populate the form with the matched contact's details
  const handleUseMatch = (match: DuplicateMatch) => {
    setForm(f => ({
      ...f,
      first_name: match.first_name || f.first_name,
      last_name: match.last_name || f.last_name,
      email: match.email || f.email,
      phone: match.mobile || match.phone || f.phone,
    }));
    if (match.communication_preferences && match.communication_preferences.length > 0) {
      setCommPrefs(match.communication_preferences as CommPreference[]);
    }
    void logDuplicateEvent({
      agencyId,
      action: 'accepted',
      matchMethod: match.match_method,
      suggestedIds: [match.id],
      acceptedContactId: match.id,
    });
    toast({
      title: '✅ Using existing contact',
      description: `Form populated from ${match.first_name} ${match.last_name ?? ''}`.trim(),
    });
    // Close — the parent will re-open to edit if it wants. For now we treat
    // accept as "found the right contact, no new contact needed".
    onClose();
  };

  const handleDismissMatch = (match: DuplicateMatch) => {
    void logDuplicateEvent({
      agencyId,
      action: 'ignored',
      matchMethod: match.match_method,
      suggestedIds: [match.id],
    });
  };

  // Returns true if the user can proceed; false if guard intercepted.
  const passesDupGuard = (): boolean => {
    if (isEditing || duplicateMatches.length === 0) return true;
    const exact = duplicateMatches.filter(
      m => m.match_method === 'email' || m.match_method === 'phone',
    );
    const fuzzy = duplicateMatches.filter(m => m.match_method === 'name_fuzzy');

    // Hard block on exact matches
    if (exact.length > 0) {
      setShowDupBlock(true);
      void logDuplicateEvent({
        agencyId,
        action: 'blocked_at_save',
        matchMethod: exact[0].match_method,
        suggestedIds: exact.map(m => m.id),
      });
      return false;
    }
    // Soft warn on fuzzy
    if (fuzzy.length > 0) {
      const f = fuzzy[0];
      toast({
        title: '⚠️ Heads up — similar contact exists',
        description: `${f.first_name} ${f.last_name ?? ''}`.trim() + ' looks similar. Saving anyway.',
      });
      void logDuplicateEvent({
        agencyId,
        action: 'soft_warned',
        matchMethod: 'name_fuzzy',
        suggestedIds: fuzzy.map(m => m.id),
      });
    }
    return true;
  };

  const performSave = async () => {
    // Build communication_preferences. Auto-populate from email/phone if empty.
    let prefsToSave: CommPreference[] = commPrefs.filter(p => p.handle.trim().length > 0);
    if (prefsToSave.length === 0) {
      const auto: CommPreference[] = [];
      if (form.phone.trim()) auto.push({ channel: 'phone', handle: form.phone.trim(), is_primary: true });
      if (form.email.trim()) auto.push({ channel: 'email', handle: form.email.trim(), is_primary: auto.length === 0 });
      prefsToSave = auto;
    }
    if (prefsToSave.length > 0 && !prefsToSave.some(p => p.is_primary)) {
      prefsToSave[0].is_primary = true;
    }
    const bad = prefsToSave.find(p => !isValidHandle(p.channel as any, p.handle));
    if (bad) {
      toast({
        title: '❌ Invalid contact channel',
        description: `Check the format for ${bad.channel}: ${bad.handle}`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        mobile: form.phone,
        preferred_suburbs: form.preferred_suburbs,
        budget_min: form.budget_min ? Math.max(0, Number(form.budget_min)) : null,
        budget_max: form.budget_max ? Math.max(0, Number(form.budget_max)) : null,
        preferred_beds: form.preferred_beds ? Math.max(0, Number(form.preferred_beds)) : null,
        preferred_baths: form.preferred_baths ? Math.max(0, Number(form.preferred_baths)) : null,
        estimated_value: form.estimated_value ? Math.max(0, Number(form.estimated_value)) : null,
        communication_preferences: prefsToSave,
      } as any);
      toast({ title: '✅ Contact saved', description: `${form.first_name} ${form.last_name}`.trim() });
      onClose();
    } catch (err: unknown) {
      toast({
        title: '❌ Failed to save contact',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    if (!passesDupGuard()) return;
    await performSave();
  };

  const handleConfirmCreateAnyway = async () => {
    setShowDupBlock(false);
    void logDuplicateEvent({
      agencyId,
      action: 'created_anyway',
      matchMethod: duplicateMatches[0]?.match_method,
      suggestedIds: duplicateMatches.map(m => m.id),
    });
    await performSave();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? (initialData ? 'Edit Contact' : 'Add New Contact')}</DialogTitle>
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

          {/* Inline duplicate match suggestions */}
          <DuplicateMatchPanel
            matches={duplicateMatches}
            onUseContact={handleUseMatch}
            onDismiss={handleDismissMatch}
          />

          <CommunicationPreferencesEditor value={commPrefs} onChange={setCommPrefs} />

          <ContactLanguagePicker
            value={form.preferred_language}
            onChange={code => setForm(f => ({ ...f, preferred_language: code }))}
          />

          {/* Google Places address autocomplete */}
          <div ref={wrapperRef} className="relative">
            <Label className="text-xs">Current Address</Label>
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
            {(form.suburb || form.state || form.country) && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {form.suburb && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.suburb}</span>}
                {form.state && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.state}</span>}
                {form.postcode && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.postcode}</span>}
                {form.country && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{form.country}</span>}
              </div>
            )}
          </div>

          {isBuyer && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                <span className="mr-1">🏠</span>
                Buyer Preferences
              </p>

              <div className="mb-3">
                <Label className="text-xs flex items-center justify-between">
                  Target Suburbs / Areas
                  <span className="text-[10px] text-primary font-normal">Auto-match listings</span>
                </Label>
                <SuburbPicker
                  suburbs={form.preferred_suburbs}
                  onChange={suburbs => setForm(f => ({ ...f, preferred_suburbs: suburbs }))}
                />
              </div>

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
                  <Label className="text-xs">Bedrooms (min)</Label>
                  <Input type="number" min="0" max="20" value={form.preferred_beds} onChange={e => setForm(f => ({...f, preferred_beds: e.target.value}))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Bathrooms (min)</Label>
                  <Input type="number" min="0" max="20" value={form.preferred_baths} onChange={e => setForm(f => ({...f, preferred_baths: e.target.value}))} className="h-9" />
                </div>
              </div>
            </div>
          )}

          {isSeller && (
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

          {leadPanel}

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.first_name.trim() || saving}>
              {saving ? 'Saving…' : (saveLabel ?? 'Save Contact')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Save-time guard for exact email/phone duplicates */}
    <AlertDialog open={showDupBlock} onOpenChange={setShowDupBlock}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This looks like an existing contact</AlertDialogTitle>
          <AlertDialogDescription>
            We found{' '}
            {duplicateMatches.length === 1 ? 'a contact' : `${duplicateMatches.length} contacts`}{' '}
            in your agency that match on{' '}
            {duplicateMatches.some(m => m.match_method === 'email') && duplicateMatches.some(m => m.match_method === 'phone')
              ? 'email or phone'
              : duplicateMatches.some(m => m.match_method === 'email')
                ? 'email'
                : 'phone'}
            :{' '}
            <span className="font-medium text-foreground">
              {duplicateMatches.slice(0, 2).map(m => `${m.first_name} ${m.last_name ?? ''}`.trim()).join(', ')}
              {duplicateMatches.length > 2 && ` +${duplicateMatches.length - 2} more`}
            </span>
            . Are you sure you want to create a duplicate?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCreateAnyway}>
            Create anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ContactFormModal;
