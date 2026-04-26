import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Users, Shield, DollarSign, Clock, HelpCircle, CalendarDays, Home, PawPrint, ClipboardCheck, UserCircle, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ListingDraft } from './PocketListingForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const VISIBILITIES = [
  { key: 'whisper', icon: <EyeOff size={16} />, label: 'Whisper', desc: 'Invite only' },
  { key: 'coming-soon', icon: <Eye size={16} />, label: 'Coming Soon', desc: 'Registered buyers' },
  { key: 'public', icon: <Users size={16} />, label: 'Public', desc: 'Full market' },
] as const;

const EXCLUSIVE_OPTIONS = [7, 14, 30];

const BUYER_REQS = [
  { key: 'none', label: 'None' },
  { key: 'pre-approved', label: 'Pre-approved' },
  { key: 'cash', label: 'Cash buyers' },
  { key: 'investors', label: 'Investors' },
];

const LEASE_TERMS = ['6 months', '12 months', '18 months', 'Month to month'];
const SCREENING_LEVELS = ['Basic', 'Full reference check', 'Background check required'];

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle size={12} className="text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-[200px] text-xs">{text}</TooltipContent>
  </Tooltip>
);

const PillGroup = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(o)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          value === o
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-muted-foreground border-border'
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);

interface ContactSuggestion {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
}

function VendorContactPicker({ draft, update, isRental }: Props & { isRental: boolean }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      if (!user) return;
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, mobile')
        .eq('created_by', user.id)
        .in('contact_type', ['seller', 'landlord', 'both'])
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(6);
      setSuggestions((data as ContactSuggestion[]) ?? []);
      setShowSuggestions(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectContact = (c: ContactSuggestion) => {
    update({
      vendorName: [c.first_name, c.last_name].filter(Boolean).join(' '),
      vendorEmail: c.email || '',
      vendorPhone: c.mobile || c.phone || '',
    });
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-1.5 mb-1">
        <UserCircle size={14} className="text-primary" />
        <Label className="text-sm font-semibold">{isRental ? 'Landlord / Owner Details' : 'Vendor / Owner Details'}</Label>
        <InfoTip text="Optional — used for vendor reports and to keep your contacts organised." />
      </div>

      {/* Contact search picker */}
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 h-9 rounded-md border border-border bg-card px-3">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder="Search existing contacts…"
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectContact(c)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</span>
                  {c.email && <span className="text-muted-foreground text-xs ml-2">{c.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Full name</Label>
        <Input
          value={draft.vendorName}
          onChange={(e) => update({ vendorName: e.target.value })}
          placeholder="e.g. Sarah Johnson"
          className="bg-card border-border"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
          <Input
            type="email"
            value={draft.vendorEmail}
            onChange={(e) => update({ vendorEmail: e.target.value })}
            placeholder="owner@email.com"
            className="bg-card border-border"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
          <Input
            type="tel"
            value={draft.vendorPhone}
            onChange={(e) => update({ vendorPhone: e.target.value })}
            placeholder="04xx xxx xxx"
            className="bg-card border-border"
          />
        </div>
      </div>
    </div>
  );
}

const StepSettings = ({ draft, update }: Props) => {
  const isRental = draft.listingType === 'rent';

  return (
    <div className="space-y-6">
      {/* Visibility — shared */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Label className="text-sm font-semibold">Listing Visibility</Label>
          <InfoTip text="Off-market listings get 8-15% higher sale prices and maintain seller privacy." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VISIBILITIES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => update({ visibility: v.key })}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all text-center ${
                draft.visibility === v.key
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {v.icon}
              <span className="text-xs font-semibold">{v.label}</span>
              <span className="text-[10px] opacity-70">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exclusive Pre-Market Window */}
      <div className="rounded-2xl border-2 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white rounded-full px-2 py-0.5">Exclusive</span>
              <Label className="text-sm font-semibold">List as Exclusive first (14-day private window)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Your listing will be visible only to ListHQ Exclusive members for 14 days before going public. Included in Pro plan or $99 add-on.
            </p>
          </div>
          <Switch
            checked={!!draft.isExclusive}
            onCheckedChange={(v) => update({ isExclusive: v })}
          />
        </div>
      </div>

      {/* ── Owner / Vendor Details ── */}
      <VendorContactPicker draft={draft} update={update} isRental={isRental} />

      {isRental ? (
        /* ═══ RENTAL SETTINGS ═══ */
        <>
          {/* Available From */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarDays size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Available From</Label>
            </div>
            <Input
              type="date"
              value={draft.availableFrom}
              onChange={(e) => update({ availableFrom: e.target.value })}
              className="bg-card border-border max-w-[200px]"
            />
          </div>

          {/* Lease Term */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Lease Term</Label>
            </div>
            <PillGroup options={LEASE_TERMS} value={draft.leaseTerm} onChange={(v) => update({ leaseTerm: v })} />
          </div>

          {/* Furnished & Pets */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <Home size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Property Options</Label>
            </div>
            <div className="space-y-2">
              <span className="text-sm">Furnished</span>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {([['unfurnished', 'Unfurnished'], ['partially_furnished', 'Partially Furnished'], ['furnished', 'Furnished']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update({ furnished: val })}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                      draft.furnished === val
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PawPrint size={14} className="text-muted-foreground" />
                <span className="text-sm">Pets Considered</span>
              </div>
              <Switch checked={draft.petsAllowed} onCheckedChange={(v) => update({ petsAllowed: v })} />
            </div>
          </div>

          {/* Application Screening */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ClipboardCheck size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Application Screening</Label>
            </div>
            <PillGroup options={SCREENING_LEVELS} value={draft.screeningLevel} onChange={(v) => update({ screeningLevel: v })} />
          </div>

          {/* Show Contact — shared */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Shield size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Agent Protection</Label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show my contact details?</span>
              <Switch checked={draft.showContact} onCheckedChange={(v) => update({ showContact: v })} />
            </div>
          </div>
        </>
      ) : (
        /* ═══ SALE SETTINGS ═══ */
        <>
          {/* Pre-market Period */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Label className="text-sm font-semibold">Pre-market Period</Label>
              <InfoTip text="How long this listing stays whisper/off-market before going public. Separate from your agency agreement exclusive period." />
            </div>
            <div className="flex gap-2">
              {EXCLUSIVE_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update({ exclusiveDays: d })}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                    draft.exclusiveDays === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  <Clock size={12} /> {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Buyer Requirements */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Buyer Requirements</Label>
            <div className="flex flex-wrap gap-1.5">
              {BUYER_REQS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => update({ buyerRequirements: b.key })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    draft.buyerRequirements === b.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Protection */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-primary" />
              <Label className="text-sm font-semibold">Agent Protection</Label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Show my contact details?</span>
              <Switch
                checked={draft.showContact}
                onCheckedChange={(v) => update({ showContact: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Allow co-broke (other agents bring buyers)?</span>
              <Switch
                checked={draft.allowCoBroke}
                onCheckedChange={(v) => update({ allowCoBroke: v })}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block flex items-center gap-1">
                <DollarSign size={12} /> Auto-decline offers below
              </Label>
              <Input
                type="number"
                value={draft.autoDeclineBelow || ''}
                onChange={(e) => update({ autoDeclineBelow: Number(e.target.value) || 0 })}
                placeholder="e.g. 750000"
                className="bg-card border-border"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StepSettings;
