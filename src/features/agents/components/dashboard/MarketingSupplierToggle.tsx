import { useState, useEffect } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';
import { Send, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAgentId } from '@/features/crm/hooks/useAgentId';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Supplier {
  id: string;
  supplier_name: string;
  company_name: string | null;
  email: string;
  service_type: string;
  is_active: boolean;
}

interface Props {
  listing: PropertyRow;
  onSent?: () => void;
}

function generateBrief(listing: PropertyRow, supplier: Supplier, agent: { name?: string; agency?: string; phone?: string; email?: string } | null): string {
  const priceText = listing.price
    ? `$${Number(listing.price).toLocaleString()}`
    : 'Contact Agent';
  const listingCategory = listing.listing_category === 'rent' ? 'For Lease' : 'For Sale';
  const listingUrl = `https://listhq.com.au/property/${listing.slug || listing.id}`;

  return `Hi ${supplier.supplier_name},

We have a new listing that requires your services.

Property: ${listing.address}${listing.suburb ? `, ${listing.suburb}` : ''}${listing.state ? ` ${listing.state}` : ''} ${listing.postcode || ''}
Listing Type: ${listingCategory}
Bedrooms: ${listing.beds ?? '—'} | Bathrooms: ${listing.baths ?? '—'} | Car Spaces: ${listing.parking ?? '—'}
Price: ${priceText}
Status: Active

Agent: ${agent?.name || '—'}
Phone: ${agent?.phone || '—'}
Email: ${agent?.email || '—'}
Agency: ${agent?.agency || '—'}

Listing Reference: ${listing.id}
View Listing: ${listingUrl}

Please confirm receipt and expected turnaround.

Thank you,
${agent?.name || '—'}
${agent?.agency || ''}`;
}

const MarketingSupplierToggle = ({ listing, onSent }: Props) => {
  const agentId = useAgentId();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [emailBody, setEmailBody] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [sent, setSent] = useState(listing.marketing_email_sent || false);
  const [sentAt, setSentAt] = useState(listing.marketing_email_sent_at || null);

  const isDraft = listing.status !== 'public' && listing.status !== 'sold';

  useEffect(() => {
    if (!agentId) return;
    supabase
      .from('agents')
      .select('id, name, email, phone, agency')
      .eq('id', agentId)
      .maybeSingle()
      .then(({ data }) => setAgent(data));
  }, [agentId]);

  const loadSuppliers = async () => {
    if (!agentId) return;
    setLoadingSuppliers(true);
    const { data } = await supabase
      .from('agent_suppliers' as any)
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true);
    const list = (data as any[]) || [];
    setSuppliers(list);
    if (list.length === 1) setSelectedSupplierId(list[0].id);
    setLoadingSuppliers(false);
  };

  const handleToggle = async (checked: boolean) => {
    if (sent) return;
    if (!checked) return;

    await loadSuppliers();

    if (suppliers.length === 0 && !loadingSuppliers) {
      // Suppliers not yet loaded, load then check
      const { data } = await supabase
        .from('agent_suppliers' as any)
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true);
      const list = (data as any[]) || [];
      setSuppliers(list);

      if (list.length === 0) {
        toast.error("You haven't added any marketing suppliers yet. Go to Settings → Suppliers to add one.");
        return;
      }
      if (list.length === 1) setSelectedSupplierId(list[0].id);
    }

    setConfirmed(false);
    setShowModal(true);
  };

  useEffect(() => {
    const selected = suppliers.find(s => s.id === selectedSupplierId);
    if (selected && agent) {
      setEmailBody(generateBrief(listing, selected, agent));
    }
  }, [selectedSupplierId, agent]);

  const handleSend = async () => {
    if (!emailBody.trim() || !selectedSupplierId || !confirmed) return;
    setSending(true);

    const { error } = await supabase.functions.invoke('send-marketing-email', {
      body: {
        listing_id: listing.id,
        supplier_id: selectedSupplierId,
        email_body: emailBody,
      },
    });

    if (error) {
      toast.error('Failed to send — please try again');
      console.error(error);
    } else {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      toast.success(`Brief sent to ${supplier?.supplier_name} at ${supplier?.email}`);
      setSent(true);
      setSentAt(new Date().toISOString());
      setShowModal(false);
      onSent?.();
    }
    setSending(false);
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-bold flex items-center gap-1.5">
            <Send size={14} /> Notify Marketing Supplier
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send a property brief to your signboard or photography supplier
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px] gap-1">
                    <CheckCircle2 size={10} /> Sent
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Brief sent on {sentAt ? format(parseISO(sentAt), 'dd MMM yyyy') : '—'}. Cannot be resent.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Switch
            checked={sent}
            onCheckedChange={handleToggle}
            disabled={sent || isDraft}
          />
        </div>
      </div>

      {isDraft && !sent && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Info size={12} /> Activate listing before notifying supplier
        </p>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Send Property Brief{selectedSupplier ? ` to ${selectedSupplier.supplier_name}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {suppliers.length > 1 && (
              <div>
                <Label className="text-xs">Select Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Choose a supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplier_name}{s.company_name ? ` — ${s.company_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSupplierId && (
              <>
                <div>
                  <Label className="text-xs mb-1.5 block">Email Preview</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={16}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>This email can only be sent once per listing. Once sent, it cannot be resent or recalled.</span>
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(c) => setConfirmed(c === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    I confirm this information is correct and I want to send this to{' '}
                    <span className="font-medium text-foreground">{selectedSupplier?.email}</span>
                  </span>
                </label>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={!confirmed || !emailBody.trim() || !selectedSupplierId || sending}
              className="gap-1.5"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingSupplierToggle;
