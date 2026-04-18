import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  customer_name: z.string().trim().min(1, 'Name is required').max(100),
  customer_email: z.string().trim().email('Invalid email').max(255),
  customer_phone: z.string().trim().max(30).optional().or(z.literal('')),
  property_address: z.string().trim().max(255).optional().or(z.literal('')),
  preferred_date: z.string().optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
});

interface Provider {
  id: string;
  name: string;
  category: string;
}

interface RequestQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
}

export function RequestQuoteModal({ open, onOpenChange, provider }: RequestQuoteModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setPhone(''); setAddress(''); setDate(''); setMessage('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    const parsed = schema.safeParse({
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      property_address: address,
      preferred_date: date,
      message,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('home_service_bookings').insert({
      provider_id: provider.id,
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email,
      customer_phone: parsed.data.customer_phone || null,
      property_address: parsed.data.property_address || null,
      preferred_date: parsed.data.preferred_date || null,
      message: parsed.data.message || null,
      status: 'pending',
    });
    setSubmitting(false);

    if (error) {
      toast.error('Could not submit your request. Please try again.');
      return;
    }
    toast.success('Your request has been sent — the provider will contact you within 4 hours');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a quote{provider ? ` — ${provider.name}` : ''}</DialogTitle>
          <DialogDescription>
            Share a few details and the provider will get back to you within 4 hours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="rq-name">Your name</Label>
            <Input id="rq-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rq-email">Email</Label>
            <Input id="rq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rq-phone">Phone</Label>
            <Input id="rq-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rq-addr">Property address</Label>
            <Input id="rq-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Smith St, Surry Hills NSW" />
          </div>
          <div>
            <Label htmlFor="rq-date">Preferred date</Label>
            <Input id="rq-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rq-msg">Message</Label>
            <Textarea
              id="rq-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything the provider should know?"
              rows={3}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
            ) : (
              'Send request'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RequestQuoteModal;
