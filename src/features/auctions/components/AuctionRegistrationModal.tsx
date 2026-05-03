import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useAuctionRegistrations } from '../hooks/useAuctionRegistrations';
import { useAuth } from '@/features/auth/AuthProvider';
import type { IdType } from '@/types/auction';

interface Props {
  auctionId: string;
  isOnline: boolean;
  open: boolean;
  onClose: () => void;
}

const ID_OPTIONS: { value: IdType; label: string }[] = [
  { value: 'drivers_licence', label: "Driver's Licence" },
  { value: 'passport', label: 'Passport' },
  { value: 'medicare_card', label: 'Medicare Card' },
  { value: 'proof_of_age_card', label: 'Proof of Age Card' },
];

export function AuctionRegistrationModal({ auctionId, isOnline, open, onClose }: Props) {
  const { user } = useAuth();
  const { addRegistration } = useAuctionRegistrations(auctionId);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paddleNumber, setPaddleNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name ?? '',
    email: user?.email ?? '',
    phone: '',
    address: '',
    is_buying_for_self: true,
    company_name: '',
    id_type: 'drivers_licence' as IdType,
    id_number: '',
    id_expiry: '',
    has_finance_approval: false,
    deposit_ready: false,
    attending_online: false,
    solicitor_name: '',
    solicitor_firm: '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.id_number || !form.id_expiry) {
      setError('ID number and expiry are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    const profileId = user?.id;
    const { data, error: err } = await addRegistration({
      ...form,
      profile_id: profileId ?? null,
    });
    if (err) {
      setError(err.message || 'Registration failed');
    } else if (data) {
      setPaddleNumber(data.paddle_number);
      setSuccess(true);
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-lg w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {success ? 'Registration Received' : `Register to Bid — Step ${step}/3`}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 mx-auto flex items-center justify-center">
              <span className="text-2xl">🎫</span>
            </div>
            <p className="font-semibold text-foreground">Registration received!</p>
            <p className="text-sm text-muted-foreground">
              Your paddle number is <span className="font-bold text-foreground">#{paddleNumber}</span>.
              It will be confirmed once approved by the listing agent.
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90">
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 gap-3">
                  <input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Full name *"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email *" type="email"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Phone *" type="tel"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Address"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.is_buying_for_self} onChange={e => update('is_buying_for_self', e.target.checked)}
                    className="rounded border-border" />
                  Buying for myself
                </label>
                {!form.is_buying_for_self && (
                  <input value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder="Company name"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                )}
              </>
            )}

            {step === 2 && (
              <>
                <select value={form.id_type} onChange={e => update('id_type', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {ID_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input value={form.id_number} onChange={e => update('id_number', e.target.value)} placeholder="ID number *"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={form.id_expiry} onChange={e => update('id_expiry', e.target.value)} placeholder="Expiry date" type="date"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                  🔒 Your ID is securely stored and only visible to the listing agent.
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.has_finance_approval} onChange={e => update('has_finance_approval', e.target.checked)} className="rounded border-border" />
                  I have finance pre-approval
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.deposit_ready} onChange={e => update('deposit_ready', e.target.checked)} className="rounded border-border" />
                  10% deposit ready (bank cheque or transfer)
                </label>
                {isOnline && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.attending_online} onChange={e => update('attending_online', e.target.checked)} className="rounded border-border" />
                    I'll be attending online
                  </label>
                )}
                <input value={form.solicitor_name} onChange={e => update('solicitor_name', e.target.value)} placeholder="Solicitor name (optional)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={form.solicitor_firm} onChange={e => update('solicitor_firm', e.target.value)} placeholder="Solicitor firm (optional)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2 pt-2">
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 text-sm text-primary hover:underline">Back</button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && (!form.full_name || !form.email || !form.phone)}
                  className="flex items-center gap-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {submitting ? 'Submitting…' : 'Submit Registration'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
