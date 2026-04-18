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

const referralSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(6, 'Phone is required').max(30),
  purchase_price: z.number().nullable().optional(),
  timeframe: z.enum(['buying_now', 'within_3_months', 'just_researching']),
});

interface MortgageBrokerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePage: string;
  defaultPrice?: number | null;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  propertyId?: string | null;
  agentId?: string | null;
}

export function MortgageBrokerModal({
  open, onOpenChange, sourcePage, defaultPrice, defaultName, defaultEmail, defaultPhone, propertyId, agentId,
}: MortgageBrokerModalProps) {
  const [name, setName] = useState(defaultName ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [price, setPrice] = useState<string>(defaultPrice ? String(defaultPrice) : '');
  const [timeframe, setTimeframe] = useState<'buying_now' | 'within_3_months' | 'just_researching'>('buying_now');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName ?? '');
      setEmail(defaultEmail ?? '');
      setPhone(defaultPhone ?? '');
      setPrice(defaultPrice ? String(defaultPrice) : '');
      setTimeframe('buying_now');
    }
  }, [open, defaultName, defaultEmail, defaultPhone, defaultPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = referralSchema.safeParse({
      name, email, phone,
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
      source_page: sourcePage,
      property_id: propertyId ?? null,
      agent_id: agentId ?? null,
      status: 'new',
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit. Please try again.');
      return;
    }
    toast.success('A broker will contact you within 2 hours.');
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
            <Label htmlFor="mb-name">Full name</Label>
            <Input id="mb-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mb-email">Email</Label>
            <Input id="mb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mb-phone">Phone</Label>
            <Input id="mb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mb-price">Purchase price (AUD)</Label>
            <Input
              id="mb-price"
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 850000"
            />
          </div>
          <div>
            <Label htmlFor="mb-timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <SelectTrigger id="mb-timeframe"><SelectValue /></SelectTrigger>
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
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : 'Connect me with a broker'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
