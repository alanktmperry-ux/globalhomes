import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const subjects = ['Technical Issue', 'Billing', 'Listing', 'Report Content', 'Other'];

export default function HelpContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Technical Issue', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('support_tickets' as any).insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject,
      message: form.message.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to submit. Please try again or email us directly.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>Contact Support</title>
        <meta name="description" content="Contact the ListHQ support team for help with your account, listings, billing, or technical issues." />
        <link rel="canonical" href="https://listhq.com.au/help/contact" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-12">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Contact Support</h1>
          <p className="text-sm text-muted-foreground mb-8">We aim to respond within 1 business day.</p>

          {submitted ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 text-primary" size={32} />
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">Thanks!</h2>
              <p className="text-sm text-muted-foreground">We've received your message and will get back to you within 1 business day.</p>
            </Card>
          ) : (
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Message *</label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} maxLength={2000} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Submitting…' : 'Send Message'}
                </Button>
              </form>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            You can also email us directly at{' '}
            <a href="mailto:support@listhq.com.au" className="text-primary hover:underline">support@listhq.com.au</a>
          </p>
        </div>
      </div>
    </>
  );
}
