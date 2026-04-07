import { useState } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, Calculator } from 'lucide-react';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

interface Props {
  listing: PropertyRow;
}

const ListingAccountingTab = ({ listing }: Props) => {
  const [salePrice, setSalePrice] = useState(listing.price || 0);
  const [commissionRate, setCommissionRate] = useState(listing.commission_rate || 2);
  const [agentSplit, setAgentSplit] = useState(listing.agent_split_percent || 60);

  // Calculations
  const totalCommission = salePrice * (commissionRate / 100);
  const gst = totalCommission * 0.1; // Always 10% GST (Australian standard)
  const commissionExGst = totalCommission - gst;
  const agencyShare = commissionExGst * ((100 - agentSplit) / 100);
  const agentShare = commissionExGst * (agentSplit / 100);

  return (
    <div className="space-y-6">
      {/* Commission Calculator */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-primary" /> Commission Calculator
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label className="text-xs">Sale Price ($)</Label>
            <Input
              type="number"
              value={salePrice}
              onChange={e => setSalePrice(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Commission Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={commissionRate}
              onChange={e => setCommissionRate(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Agent Split (%)</Label>
            <Input
              type="number"
              step="1"
              value={agentSplit}
              onChange={e => setAgentSplit(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>

        {/* Results */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Total Commission</p>
              <p className="text-lg font-display font-bold text-primary">{AUD.format(totalCommission)}</p>
              <p className="text-[10px] text-muted-foreground">inc. GST</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">GST (10%)</p>
              <p className="text-lg font-display font-bold text-destructive">{AUD.format(gst)}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Commission ex GST</p>
              <p className="text-lg font-display font-bold">{AUD.format(commissionExGst)}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Agency Share ({100 - agentSplit}%)</p>
              <p className="text-lg font-display font-bold">{AUD.format(agencyShare)}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3 ring-2 ring-primary/20">
              <p className="text-[10px] text-muted-foreground uppercase">Your Share ({agentSplit}%)</p>
              <p className="text-lg font-display font-bold text-success">{AUD.format(agentShare)}</p>
            </div>
          </div>
        </div>

        {/* Breakdown summary */}
        <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs">
          <p>
            <strong>Summary:</strong> On a sale of {AUD.format(salePrice)} at {commissionRate}% commission,
            the total commission is {AUD.format(totalCommission)} (inc. {AUD.format(gst)} GST).
            After GST, {AUD.format(commissionExGst)} is split {agentSplit}/{100 - agentSplit} —
            you receive <strong className="text-success">{AUD.format(agentShare)}</strong> and
            the agency receives {AUD.format(agencyShare)}.
          </p>
        </div>
      </div>

      {/* Transaction History placeholder */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-primary" /> Transaction History
        </h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          No transactions recorded for this listing yet.
          <br />
          <span className="text-xs">Transactions will appear here when settlement is processed via Trust Accounting.</span>
        </div>
      </div>
    </div>
  );
};

export default ListingAccountingTab;
