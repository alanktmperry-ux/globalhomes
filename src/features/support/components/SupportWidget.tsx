import { useState } from 'react';
import { LifeBuoy, X, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/utils';

const CATEGORIES = [
  { value: 'technical', label: 'Technical issue' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'listing', label: 'Listings' },
  { value: 'agent_support', label: 'Agent support' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'other', label: 'Other' },
];

export function SupportWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(user?.email ?? '');
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('technical');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const reset = () => {
    setSubmitting(false); setDone(false); setError(null);
    setSubject(''); setBody('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('submit-support-ticket', {
        body: {
          email: email.trim(),
          full_name: fullName.trim() || null,
          category,
          subject: subject.trim(),
          body: body.trim(),
          context: {
            page_url: window.location.href,
            user_agent: navigator.userAgent,
            authenticated: !!user,
          },
        },
      });
      if (invokeError) throw invokeError;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send. Please try again or email support@listhq.com.au.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        aria-label="Contact support"
        className={cn(
          'fixed z-[90] rounded-full shadow-lg',
          'bottom-20 right-4 md:bottom-6 md:right-6',
          'h-12 px-4 flex items-center gap-2',
          'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
        )}
      >
        <LifeBuoy size={18} strokeWidth={2} />
        <span className="text-sm font-semibold hidden sm:inline">Help</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-end p-0 sm:p-6 bg-black/40">
          <div
            className={cn(
              'w-full sm:max-w-md bg-background border border-border shadow-2xl',
              'rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]',
            )}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-primary" />
                <h2 className="font-semibold">Contact support</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-accent">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-green-600" size={36} />
                <h3 className="font-semibold mb-1">We've got your message</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  We've sent a confirmation to {email}. Our team will reply soon.
                </p>
                <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sw-name">Name</Label>
                    <Input id="sw-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="sw-email">Email *</Label>
                    <Input id="sw-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sw-cat">Topic</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="sw-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sw-subj">Subject *</Label>
                  <Input
                    id="sw-subj" required maxLength={200}
                    value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Briefly, what's going on?"
                  />
                </div>
                <div>
                  <Label htmlFor="sw-body">Message *</Label>
                  <Textarea
                    id="sw-body" required maxLength={5000} rows={5}
                    value={body} onChange={(e) => setBody(e.target.value)}
                    placeholder="Tell us what happened. Include any error message or screenshot URL."
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <><Loader2 className="animate-spin mr-2" size={16} />Sending…</> : 'Send to support'}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Or email <a href="mailto:support@listhq.com.au" className="underline">support@listhq.com.au</a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SupportWidget;
