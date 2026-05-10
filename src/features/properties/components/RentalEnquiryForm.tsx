import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  message: z.string().trim().max(1000).optional(),
});

interface RentalEnquiryFormProps {
  property: Property;
  open: boolean;
  onClose: () => void;
}

export function RentalEnquiryForm({ property, open, onClose }: RentalEnquiryFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', moveInDate: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = enquirySchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('leads').insert({
        property_id: property.id,
        agent_id: property.agent.id,
        user_name: result.data.name,
        user_email: result.data.email,
        user_phone: result.data.phone,
        message: `Move-in date: ${result.data.moveInDate}${result.data.message ? `\n\n${result.data.message}` : ''}`,
        buying_purpose: 'rental',
        urgency: 'ready_to_move',
      });

      if (error) throw error;

      toast.success(t('rentalEnquiry.successToast'));
      setForm({ name: '', email: '', phone: '', moveInDate: '', message: '' });
      onClose();
    } catch {
      toast.error(t('rentalEnquiry.errorToast'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{t('rentalEnquiry.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{property.title} — {property.suburb}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('rentalEnquiry.nameLabel')}</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('rentalEnquiry.namePlaceholder')}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('rentalEnquiry.emailLabel')}</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={t('rentalEnquiry.emailPlaceholder')}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('rentalEnquiry.phoneLabel')}</label>
            <input
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t('rentalEnquiry.phonePlaceholder')}
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('rentalEnquiry.moveInDateLabel')}</label>
            <input
              type="date"
              className={inputClass}
              value={form.moveInDate}
              onChange={e => setForm(f => ({ ...f, moveInDate: e.target.value }))}
            />
            {errors.moveInDate && <p className="text-xs text-destructive mt-1">{errors.moveInDate}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('rentalEnquiry.messageLabel')}</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={t('rentalEnquiry.messagePlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? t('rentalEnquiry.submitting') : t('rentalEnquiry.submitButton')}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
