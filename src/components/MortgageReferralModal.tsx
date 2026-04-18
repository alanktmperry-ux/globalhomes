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
    setSubmitting(false);

    if (error) {
      toast.error('Could not submit. Please try again.');
      return;
    }
    toast.success('A broker will contact you within 2 hours');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect with a mortgage broker</DialogTitle>
          <DialogDescription>
            A licensed broker will help you understand your borrowing power and pre-approval options.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="mr-name">Full name</Label>
            <Input id="mr-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-email">Email</Label>
            <Input id="mr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-phone">Phone</Label>
            <Input id="mr-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mr-price">Purchase price (AUD)</Label>
            <Input
              id="mr-price"
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 850000"
            />
          </div>
          <div>
            <Label htmlFor="mr-timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
              <SelectTrigger id="mr-timeframe"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buying_now">Buying now</SelectItem>
                <SelectItem value="within_3_months">Within 3 months</SelectItem>
                <SelectItem value="just_researching">Just researching</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            By submitting, you agree to be contacted by a licensed mortgage broker. ListHQ may receive a referral fee.
          </p>
          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <span className="leading-relaxed">
              I understand that ListHQ may receive a referral fee from a broker or lender if I proceed with a loan. ListHQ is not a licensed credit adviser and is not providing financial or credit advice.
            </span>
          </label>
          <Button type="submit" disabled={submitting || !acknowledged} className="w-full">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
            ) : (
              'Connect me with a broker'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MortgageReferralModal;
