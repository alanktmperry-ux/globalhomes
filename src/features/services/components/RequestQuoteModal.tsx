import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

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
  const { t } = useTranslation();
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
          <DialogTitle>{t('homeServices.modal.title', { providerName: provider?.name ?? '' })}</DialogTitle>
          <DialogDescription>
            {t('homeServices.modal.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="rq-name">{t('homeServices.modal.nameLabel')}</Label>
            <Input id="rq-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rq-email">{t('homeServices.modal.emailLabel')}</Label>
            <Input id="rq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rq-phone">{t('homeServices.modal.phoneLabel')}</Label>
            <Input id="rq-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rq-addr">{t('homeServices.modal.addressLabel')}</Label>
            <AddressAutocomplete
              value={address}
              onChange={(raw) => setAddress(raw)}
              onSelect={(parts) => setAddress(parts.address)}
              placeholder={t('homeServices.modal.addressPlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="rq-date">{t('homeServices.modal.dateLabel')}</Label>
            <Input id="rq-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rq-msg">{t('homeServices.modal.messageLabel')}</Label>
            <Textarea
              id="rq-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('homeServices.modal.messagePlaceholder')}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('homeServices.modal.sending')}</>
            ) : (
              t('homeServices.modal.sendButton')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RequestQuoteModal;
