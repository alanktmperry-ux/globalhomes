import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Send, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { generateOfferPdf } from '@/features/agents/lib/generateOfferPdf';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface OfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: { id: string; address: string; contactName: string; estimatedValue: number };
  propertyId: string;
  agentId: string;
  onSent: (offerId: string) => void;
}

const OfferModal = ({ open, onOpenChange, card, propertyId, agentId, onSent }: OfferModalProps) => {
  const [offerAmount, setOfferAmount] = useState(card.estimatedValue || 0);
  const [settlementDays, setSettlementDays] = useState(60);
  const [conditions, setConditions] = useState('Subject to finance and building & pest inspection');
  const [draftText, setDraftText] = useState('');
  const [comparableSales, setComparableSales] = useState<{ address: string; price: number }[]>([]);
  const [suburbMedian, setSuburbMedian] = useState<number | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-offer', {
        body: { lead_id: card.id, property_id: propertyId, agent_id: agentId, offer_amount: offerAmount, settlement_days: settlementDays, conditions },
      });
      if (error) throw error;
      setDraftText(data.draftText || '');
      setComparableSales(data.comparableSales || []);
      setSuburbMedian(data.suburbMedian || null);
      setOfferId(data.offerId || null);
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftText);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDownloadPdf = () => {
    generateOfferPdf({
      propertyAddress: card.address,
      buyerName: card.contactName,
      offerAmount,
      settlementDays,
      conditions,
      draftText,
      comparableSales,
      suburbMedian,
    });
    toast({ title: 'PDF downloaded' });
  };

  const handleMarkSent = async () => {
    if (!offerId) return;
    setMarking(true);
    try {
      await supabase.from('offers').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', offerId);
      toast({ title: 'Offer marked as sent' });
      onSent(offerId);
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setMarking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            AI Offer Assistant
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-3">{card.address} · {card.contactName}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Offer Amount (AUD)</label>
            <Input type="number" value={offerAmount} onChange={e => setOfferAmount(Number(e.target.value))} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Settlement Days</label>
            <Input type="number" value={settlementDays} onChange={e => setSettlementDays(Number(e.target.value))} className="mt-1 h-9 text-sm" />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conditions</label>
          <Textarea value={conditions} onChange={e => setConditions(e.target.value)} className="mt-1 text-sm min-h-[60px]" />
        </div>

        <Button onClick={handleGenerate} disabled={generating || !offerAmount} className="w-full mb-4 gap-2">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generating…' : 'Generate Draft'}
        </Button>

        {draftText && (
          <>
            <Textarea value={draftText} onChange={e => setDraftText(e.target.value)} className="text-sm min-h-[200px] mb-3 font-mono" />

            {comparableSales.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Comparable Sales</p>
                <div className="flex flex-wrap gap-1.5">
                  {comparableSales.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {c.address} · {AUD.format(c.price)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {suburbMedian && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 text-center">
                <p className="text-xs text-muted-foreground">Suburb median</p>
                <p className="text-lg font-bold text-primary">{AUD.format(suburbMedian)}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy} className="flex-1 gap-1.5 text-xs">
                <Copy size={12} /> Copy Letter
              </Button>
              <Button onClick={handleMarkSent} disabled={marking} className="flex-1 gap-1.5 text-xs">
                {marking ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Mark as Sent
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">Cancel</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OfferModal;
