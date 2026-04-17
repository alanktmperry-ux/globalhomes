import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface SettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyAddress: string;
  initialPrice: number;
  agentId: string | null;
  userId: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

const SettlementModal = ({
  open,
  onOpenChange,
  propertyId,
  propertyAddress,
  initialPrice,
  agentId,
  userId,
  onConfirmed,
  onCancel,
}: SettlementModalProps) => {
  const navigate = useNavigate();
  const [salePrice, setSalePrice] = useState<number>(initialPrice || 0);
  const [commissionRate, setCommissionRate] = useState<number>(2.5);
  const [agentSplit, setAgentSplit] = useState<number>(70);
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const calc = useMemo(() => {
    const totalCommission = (salePrice || 0) * (commissionRate / 100);
    const gst = totalCommission / 11;
    const commissionExGst = totalCommission - gst;
    const agentTakeHome = commissionExGst * (agentSplit / 100);
    const agencyShare = commissionExGst - agentTakeHome;
    return { totalCommission, gst, commissionExGst, agentTakeHome, agencyShare };
  }, [salePrice, commissionRate, agentSplit]);

  const handleConfirm = async () => {
    if (!agentId) {
      toast.error('Agent profile not loaded');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Mark property as sold/settled
      const { error: propErr } = await supabase
        .from('properties')
        .update({ status: 'sold', is_active: false } as any)
        .eq('id', propertyId);
      if (propErr) throw propErr;

      // 2. Find or create the agent's primary trust account
      let { data: account } = await supabase
        .from('trust_accounts')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .maybeSingle();

      if (!account) {
        const { data: newAccount, error: accErr } = await supabase
          .from('trust_accounts')
          .insert({
            agent_id: agentId,
            account_name: 'Primary Trust Account',
            account_type: 'sales_trust',
            is_active: true,
          })
          .select('id')
          .maybeSingle();
        if (accErr) throw accErr;
        account = newAccount;
      }

      if (!account?.id) throw new Error('Could not resolve trust account');

      // 3. Insert commission transaction
      const { error: txErr } = await supabase
        .from('trust_transactions')
        .insert({
          trust_account_id: account.id,
          property_id: propertyId,
          created_by: userId,
          transaction_type: 'commission',
          category: 'commission',
          amount: Math.round(calc.agentTakeHome * 100) / 100,
          gst_amount: Math.round((calc.gst * (agentSplit / 100)) * 100) / 100,
          description: `Commission — ${propertyAddress}`,
          transaction_date: settlementDate,
          status: 'pending',
        });
      if (txErr) throw txErr;

      toast.success(`Settlement recorded — commission of ${AUD.format(calc.agentTakeHome)} added to trust account`);
      onConfirmed();
      onOpenChange(false);
      navigate('/dashboard/trust');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); else onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Settlement</DialogTitle>
          <DialogDescription className="truncate">{propertyAddress}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sale-price" className="text-xs">Sale Price (AUD)</Label>
              <Input
                id="sale-price"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="settlement-date" className="text-xs">Settlement Date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="commission-rate" className="text-xs">Commission Rate (%)</Label>
              <Input
                id="commission-rate"
                type="number"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="agent-split" className="text-xs">Agent Split (%)</Label>
              <Input
                id="agent-split"
                type="number"
                step="1"
                value={agentSplit}
                onChange={(e) => setAgentSplit(Number(e.target.value))}
                className="h-9"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
            <Row label="Total commission" value={AUD.format(calc.totalCommission)} />
            <Row label="GST (10%)" value={AUD.format(calc.gst)} />
            <Row label="Commission ex-GST" value={AUD.format(calc.commissionExGst)} />
            <div className="border-t border-border my-1" />
            <Row label="Agent take-home" value={AUD.format(calc.agentTakeHome)} bold />
            <Row label="Agency share" value={AUD.format(calc.agencyShare)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Saving…' : 'Confirm Settlement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={bold ? 'font-bold text-foreground' : 'text-foreground'}>{value}</span>
  </div>
);

export default SettlementModal;
