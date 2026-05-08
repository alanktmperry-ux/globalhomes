import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export default function PartnerReferralPage() {
  const { code } = useParams<{ code: string }>();
  const [form, setForm] = useState({ name: '', email: '', phone: '', suburb_interest: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('partner_buyer_leads').insert({
      partner_code: code ?? 'unknown',
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      suburb_interest: form.suburb_interest.trim() || null,
      consent_given: true,
    } as any);
    setSubmitting(false);
    if (err) {
      setError('Something went wrong — please try again.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4 bg-card rounded-2xl p-8 shadow-sm border">
          <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
          <h1 className="text-2xl font-semibold">You're registered!</h1>
          <p className="text-sm text-muted-foreground">
            We've got your details. You'll hear from your agent soon with properties that match what you're looking for.
          </p>
          <p className="text-xs text-muted-foreground pt-4">Powered by ListHQ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-sm border">
        <div className="text-center mb-6 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
            L
          </div>
          <h1 className="text-2xl font-semibold">Stay in the loop</h1>
          <p className="text-sm text-muted-foreground">
            Register your interest and your agent will send you matching properties.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name *</Label>
            <Input id="name" value={form.name} onChange={set('name')} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile (optional)</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suburb">Suburb you're looking in (optional)</Label>
            <Input id="suburb" value={form.suburb_interest} onChange={set('suburb_interest')} />
          </div>

          <p className="text-xs text-muted-foreground">
            By submitting you agree to ListHQ's{' '}
            <a href="/privacy" className="underline" target="_blank" rel="noreferrer">Privacy Policy</a>.
            Your details will be shared with the referring agent.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (<><Loader2 size={14} className="animate-spin mr-2" /> Submitting…</>) : 'Register my interest'}
          </Button>
        </form>
      </div>
    </div>
  );
}
