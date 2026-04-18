import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const SCHEMA = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Valid email required').max(160),
  phone: z.string().trim().min(6, 'Phone is required').max(40),
  property_address: z.string().trim().max(240).optional().or(z.literal('')),
  transaction_type: z.enum(['Buying', 'Selling', 'Both']),
  settlement_date: z.string().optional().or(z.literal('')),
});

const CIRCUMSTANCES = ['First home buyer', 'Investment property', 'Off-the-plan', 'Foreign buyer (FIRB)'];

export interface GetQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conveyancerId?: string | null;
  conveyancerName?: string | null;
  defaultTransactionType?: 'Buying' | 'Selling' | 'Both';
  source?: string;
  propertyId?: string | null;
  agentId?: string | null;
}

export const GetQuoteModal = ({
  open,
  onOpenChange,
  conveyancerId = null,
  conveyancerName = null,
  defaultTransactionType = 'Buying',
  source = 'conveyancing_page',
  propertyId = null,
  agentId = null,
}: GetQuoteModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'Buying' | 'Selling' | 'Both'>(defaultTransactionType);
  const [settlementDate, setSettlementDate] = useState('');
  const [circumstances, setCircumstances] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setType(defaultTransactionType);
  }, [open, defaultTransactionType]);

  const toggleCircumstance = (c: string) => {
    setCircumstances((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleSubmit = async () => {
    const parsed = SCHEMA.safeParse({
      name, email, phone, property_address: address, transaction_type: type, settlement_date: settlementDate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Please check the form');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('conveyancing_referrals').insert({
        conveyancer_id: conveyancerId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        property_address: parsed.data.property_address || null,
        transaction_type: parsed.data.transaction_type,
        settlement_date: parsed.data.settlement_date || null,
        special_circumstances: circumstances.length ? circumstances : null,
        source,
        property_id: propertyId,
        agent_id: agentId,
        status: 'new',
      });
      if (error) throw error;
      toast.success('A conveyancer will contact you within 2 hours');
      onOpenChange(false);
      setName(''); setEmail(''); setPhone(''); setAddress('');
      setSettlementDate(''); setCircumstances([]);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get a fixed-fee conveyancing quote</DialogTitle>
          <DialogDescription>
            {conveyancerName ? `From ${conveyancerName}.` : ''} Licensed professionals — no hidden costs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cv-name" className="text-xs">Your name</Label>
              <Input id="cv-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label htmlFor="cv-phone" className="text-xs">Phone</Label>
              <Input id="cv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="cv-email" className="text-xs">Email</Label>
            <Input id="cv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="cv-address" className="text-xs">Property address</Label>
            <Input id="cv-address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-9" placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Transaction</Label>
              <div className="flex gap-1 mt-1">
                {(['Buying', 'Selling', 'Both'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setType(opt)}
                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-colors ${
                      type === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="cv-settle" className="text-xs">Settlement date</Label>
              <Input id="cv-settle" type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Special circumstances</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {CIRCUMSTANCES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={circumstances.includes(c)} onCheckedChange={() => toggleCircumstance(c)} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            By submitting you agree to be contacted by the conveyancer. ListHQ may receive a referral fee.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Connect me with a conveyancer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GetQuoteModal;
