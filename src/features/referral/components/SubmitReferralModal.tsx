import { useState } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { REFERRAL_COUNTRIES } from '@/features/referral/lib/constants';

const leadSchema = z.object({
  buyer_name: z.string().trim().min(2, 'Buyer name is required').max(120),
  buyer_email: z.string().trim().email('Invalid email').max(255),
  buyer_phone: z.string().trim().max(40).optional().or(z.literal('')),
  buyer_country: z.string().min(1, 'Country is required'),
  property_url: z.string().trim().min(2, 'Property URL or address is required').max(500),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

interface Props {
  open: boolean;
  onClose: () => void;
  agentId: string;
  referralCode: string;
  onSubmitted: () => void;
}

export function SubmitReferralModal({ open, onClose, agentId, referralCode, onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    buyer_country: '',
    property_url: '',
    notes: '',
  });

  const update = (k: keyof typeof form, v: string) => setForm(s => ({ ...s, [k]: v }));

  const reset = () => {
    setForm({ buyer_name: '', buyer_email: '', buyer_phone: '', buyer_country: '', property_url: '', notes: '' });
    setConfirmation(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('referral_leads')
        .insert({
          referral_agent_id: agentId,
          referred_by_code: referralCode,
          buyer_name: parsed.data.buyer_name,
          buyer_email: parsed.data.buyer_email,
          buyer_phone: parsed.data.buyer_phone || null,
          buyer_country: parsed.data.buyer_country,
          property_url: parsed.data.property_url,
          notes: parsed.data.notes || null,
        })
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error('Could not create referral');

      setConfirmation(data.id.slice(0, 8).toUpperCase());
      onSubmitted();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[SubmitReferral]', err);
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            role="dialog" aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[92vh] bg-card rounded-t-3xl shadow-drawer overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-2xl"
            initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {confirmation ? 'Referral submitted' : 'Submit a referral'}
              </h2>
              <button onClick={handleClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pb-6">
              {confirmation ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="text-emerald-600" size={24} />
                  </div>
                  <p className="text-sm text-muted-foreground">Your referral has been recorded. We'll be in touch with the buyer shortly.</p>
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono font-semibold text-foreground">#{confirmation}</span>
                  </div>
                  <div className="mt-6 flex gap-2 justify-center">
                    <Button variant="outline" onClick={reset}>Submit another</Button>
                    <Button onClick={handleClose}>Done</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label htmlFor="buyer_name">Buyer name *</Label>
                    <Input id="buyer_name" value={form.buyer_name} onChange={e => update('buyer_name', e.target.value)} maxLength={120} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="buyer_email">Buyer email *</Label>
                      <Input id="buyer_email" type="email" value={form.buyer_email} onChange={e => update('buyer_email', e.target.value)} maxLength={255} required />
                    </div>
                    <div>
                      <Label htmlFor="buyer_phone">Buyer phone</Label>
                      <Input id="buyer_phone" type="tel" value={form.buyer_phone} onChange={e => update('buyer_phone', e.target.value)} maxLength={40} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="buyer_country">Buyer country *</Label>
                    <select
                      id="buyer_country"
                      value={form.buyer_country}
                      onChange={e => update('buyer_country', e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select country</option>
                      {REFERRAL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="property_url">Property URL or address *</Label>
                    <Input id="property_url" value={form.property_url} onChange={e => update('property_url', e.target.value)} maxLength={500} required placeholder="https://… or 123 Smith St, Sydney" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={form.notes} onChange={e => update('notes', e.target.value)} maxLength={2000} rows={3} placeholder="Budget, preferences, timeline…" />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? 'Submitting…' : 'Submit referral'}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
