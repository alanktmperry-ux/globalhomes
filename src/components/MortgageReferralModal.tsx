import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from '@/shared/lib/i18n';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(6, 'Phone is required').max(30),
  purchase_price: z.number().nullable().optional(),
  timeframe: z.enum(['buying_now', 'within_3_months', 'just_researching']),
});

interface MortgageReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLabel: string;
  propertyId?: string;
  purchasePrice?: number;
}

export function MortgageReferralModal({
  open,
  onOpenChange,
  sourceLabel,
  propertyId,
  purchasePrice,
}: MortgageReferralModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState<string>(purchasePrice ? String(purchasePrice) : '');
  const [timeframe, setTimeframe] = useState<'buying_now' | 'within_3_months' | 'just_researching'>('buying_now');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
      setPrice(purchasePrice ? String(purchasePrice) : '');
      setTimeframe('buying_now');
      setAcknowledged(false);
    }
  }, [open, purchasePrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      email,
      phone,
      purchase_price: price ? Number(price) : null,
      timeframe,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('mortgage_referrals').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      purchase_price: parsed.data.purchase_price ?? null,
      timeframe: parsed.data.timeframe,
      source_page: sourceLabel,
      property_id: propertyId ?? null,
      status: 'new',
    });

    if (error) {
      setSubmitting(false);
      toast.error(t('common.errors.couldNotSubmit'));
      return;
    }

    await supabase.from('referral_leads').insert({
      buyer_name: parsed.data.name,
      buyer_email: parsed.data.email,
      buyer_phone: parsed.data.phone,
      estimated_loan_amount: parsed.data.purchase_price ? Number(parsed.data.purchase_price) : null,
      loan_type: null,
      message: `Timeframe: ${parsed.data.timeframe}`,
      property_id: propertyId ?? null,
      status: 'new',
      assigned_broker_id: null,
    } as any);

    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: 'leads@diamondlending.com.au',
        subject: 'New mortgage referral from ListHQ',
        body: `New referral received.\n\nName: ${parsed.data.name}\nEmail: ${parsed.data.email}\nPhone: ${parsed.data.phone}\nLoan amount: $${parsed.data.purchase_price ?? ''}\n\nLog in to your broker portal to view and contact this lead.`,
      },
    });

    setSubmitting(false);
    toast.success(t('mortgage.referral.successToast'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('mortgage.referral.title')}</DialogTitle>
          <DialogDescription>
            {t('mortgage.referral.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="mr-name">{t('mortgage.referral.fullName')}</Label>
            <Input id="mr-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-email">{t('mortgage.referral.email')}</Label>
            <Input id="mr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-phone">{t('mortgage.referral.phone')}</Label>
            <Input id="mr-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-price">{t('mortgage.referral.purchasePrice')}</Label>
            <Input
              id="mr-price"
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('mortgage.referral.purchasePricePlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="mr-timeframe">{t('mortgage.referral.timeframe')}</Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
              <SelectTrigger id="mr-timeframe"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buying_now">{t('mortgage.referral.timeframe.buyingNow')}</SelectItem>
                <SelectItem value="within_3_months">{t('mortgage.referral.timeframe.within3Months')}</SelectItem>
                <SelectItem value="just_researching">{t('mortgage.referral.timeframe.justResearching')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('mortgage.referral.consent')}
          </p>
          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <span className="leading-relaxed">
              {t('mortgage.referral.acknowledgement')}
            </span>
          </label>
          <Button type="submit" disabled={submitting || !acknowledged} className="w-full">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.buttons.submitting')}</>
            ) : (
              t('mortgage.referral.submit')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MortgageReferralModal;
