import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, Download, CheckCircle2, FileText, Calendar, User, Home, DollarSign, CreditCard, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_DISPLAY = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'eft', label: 'EFT' },
];

const PURPOSE_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'rent', label: 'Rent' },
  { value: 'bond', label: 'Bond' },
  { value: 'holding_fee', label: 'Holding Fee' },
  { value: 'commission', label: 'Commission' },
];

const LEDGER_OPTIONS = [
  { value: 'sales_trust', label: 'Sales Trust' },
  { value: 'rental_trust', label: 'Rental Trust' },
];

interface TrustReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  agentId?: string;
}

export default function TrustReceiptModal({ open, onOpenChange, onCreated, agentId: agentIdProp }: TrustReceiptModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [nextReceiptNumber, setNextReceiptNumber] = useState('REC-001');

  // Form state
  const [clientName, setClientName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eft');
  const [purpose, setPurpose] = useState('deposit');
  const [ledger, setLedger] = useState('sales_trust');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [dateDeposited, setDateDeposited] = useState('');
  const [notes, setNotes] = useState('');
  const [matterRef, setMatterRef] = useState('');

  // Fetch next sequential receipt number
  const fetchNextNumber = useCallback(async () => {
    const { data } = await supabase
      .from('trust_receipts')
      .select('receipt_number')
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const last = data[0].receipt_number;
      const match = last.match(/(\d+)$/);
      if (match) {
        const next = String(parseInt(match[1], 10) + 1).padStart(3, '0');
        setNextReceiptNumber(`REC-${next}`);
      } else {
        setNextReceiptNumber('REC-002');
      }
    } else {
      setNextReceiptNumber('REC-001');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchNextNumber();
      // Reset form
      setClientName('');
      setPropertyAddress('');
      setAmount('');
      setPaymentMethod('eft');
      setPurpose('deposit');
      setLedger('sales_trust');
      setDateReceived(new Date().toISOString().split('T')[0]);
      setDateDeposited('');
      setNotes('');
      setMatterRef('');
      setShowPreview(false);
    }
  }, [open, fetchNextNumber]);

  const parsedAmount = parseFloat(amount) || 0;
  const gstAmount = parsedAmount / 11; // GST-inclusive calculation
  const purposeLabel = PURPOSE_OPTIONS.find(o => o.value === purpose)?.label || purpose;
  const methodLabel = PAYMENT_METHODS.find(o => o.value === paymentMethod)?.label || paymentMethod;
  const ledgerLabel = LEDGER_OPTIONS.find(o => o.value === ledger)?.label || ledger;

  const canSubmit = clientName.trim() && propertyAddress.trim() && parsedAmount > 0;

  const handleIssueReceipt = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);

    try {
      // Get agent_id
      let agentQuery = supabase
        .from('agents')
        .select('id, name, agency, license_number');
      if (agentIdProp) {
        agentQuery = agentQuery.eq('id', agentIdProp);
      } else {
        agentQuery = agentQuery.eq('user_id', user?.id || '');
      }
      const { data: agent } = await agentQuery.single();

      if (!agent) {
        toast.error('Agent profile not found');
        setSaving(false);
        return;
      }

      // Insert into trust_receipts
      const { error } = await supabase.from('trust_receipts').insert({
        receipt_number: nextReceiptNumber,
        agent_id: agent.id,
        client_name: clientName.trim(),
        property_address: propertyAddress.trim(),
        amount: parsedAmount,
        payment_method: paymentMethod,
        purpose,
        date_received: dateReceived,
        date_deposited: dateDeposited || null,
        ledger_account: ledger,
        status: dateDeposited ? 'deposited' : 'received',
      } as any);

      if (error) throw error;

      // Generate PDF
      generateReceiptPdf({
        receiptNumber: nextReceiptNumber,
        dateReceived,
        dateDeposited: dateDeposited || null,
        clientName: clientName.trim(),
        propertyAddress: propertyAddress.trim(),
        amount: parsedAmount,
        gstAmount,
        paymentMethod: methodLabel,
        purpose: purposeLabel,
        ledger: ledgerLabel,
        notes: notes.trim(),
        matterRef: matterRef.trim(),
        agentName: agent.name,
        agency: agent.agency || '',
        licenseNumber: agent.license_number || '',
      });

      toast.success(`Trust Receipt ${nextReceiptNumber} issued successfully`);
      onOpenChange(false);
      onCreated?.();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || 'Failed to issue receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt size={20} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">New Trust Receipt</DialogTitle>
              <DialogDescription className="text-xs">
                Agents Financial Administration Act 2014 — Trust Account Receipt
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Receipt Number Banner */}
        <div className="flex items-center justify-between bg-muted/60 border border-border rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">TRUST RECEIPT</span>
          </div>
          <Badge variant="secondary" className="text-sm font-mono font-bold tracking-wide">
            {nextReceiptNumber}
          </Badge>
        </div>

        {!showPreview ? (
          /* ── FORM VIEW ── */
          <div className="space-y-4">
            {/* Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Calendar size={12} className="text-muted-foreground" /> Date Received
                </Label>
                <Input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Calendar size={12} className="text-muted-foreground" /> Date Deposited
                </Label>
                <Input type="date" value={dateDeposited} onChange={e => setDateDeposited(e.target.value)} className="h-9"
                  placeholder="Set when deposited to bank" />
              </div>
            </div>

            {/* Client & Property */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <User size={12} className="text-muted-foreground" /> Client Name *
                </Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. John Smith" className="h-9" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Home size={12} className="text-muted-foreground" /> Property Address *
                </Label>
                <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)}
                  placeholder="e.g. 123 Beach Rd, Gold Coast" className="h-9" />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                <CreditCard size={12} className="text-muted-foreground" /> Payment Method
              </Label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === m.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                <DollarSign size={12} className="text-muted-foreground" /> Amount (AUD) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="25,000.00"
                  className="h-10 pl-7 text-lg font-semibold"
                />
              </div>
              {parsedAmount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  GST component (1/11th): {AUD.format(gstAmount)}
                </p>
              )}
            </div>

            {/* Purpose & Ledger */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <BookOpen size={12} className="text-muted-foreground" /> Purpose
                </Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <BookOpen size={12} className="text-muted-foreground" /> Ledger Account
                </Label>
                <Select value={ledger} onValueChange={setLedger}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEDGER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matter Reference */}
            <div>
              <Label className="text-xs mb-1.5">Client Matter Reference</Label>
              <Input value={matterRef} onChange={e => setMatterRef(e.target.value)}
                placeholder="e.g. SMITH-2026-001" className="h-9" />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs mb-1.5">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Buyer deposit for 123 Beach Rd purchase"
                rows={2} />
            </div>
          </div>
        ) : (
          /* ── PREVIEW VIEW ── */
          <ReceiptPreview
            receiptNumber={nextReceiptNumber}
            dateReceived={dateReceived}
            dateDeposited={dateDeposited}
            clientName={clientName}
            propertyAddress={propertyAddress}
            amount={parsedAmount}
            gstAmount={gstAmount}
            paymentMethod={methodLabel}
            purpose={purposeLabel}
            ledger={ledgerLabel}
            notes={notes}
            matterRef={matterRef}
          />
        )}

        <Separator />

        {/* Compliance note */}
        <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3 border border-border">
          <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-0.5">Compliance Notice</p>
            <p>
              This receipt complies with the <strong>Agents Financial Administration Act 2014</strong>.
              A duplicate copy will be retained for the 5-year compliance retention period.
              All receipts are sequentially numbered and form part of the trust account audit trail.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!showPreview ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={!canSubmit}>
                Preview Receipt
              </Button>
              <Button onClick={handleIssueReceipt} disabled={!canSubmit || saving} className="gap-1.5">
                <Receipt size={14} />
                {saving ? 'Issuing…' : 'Issue Receipt'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowPreview(false)}>← Edit</Button>
              <Button onClick={handleIssueReceipt} disabled={saving} className="gap-1.5">
                <Receipt size={14} />
                {saving ? 'Issuing…' : 'Issue Receipt & Generate PDF'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Receipt Preview Component ── */
function ReceiptPreview({
  receiptNumber, dateReceived, dateDeposited, clientName, propertyAddress,
  amount, gstAmount, paymentMethod, purpose, ledger, notes, matterRef,
}: {
  receiptNumber: string; dateReceived: string; dateDeposited: string;
  clientName: string; propertyAddress: string; amount: number; gstAmount: number;
  paymentMethod: string; purpose: string; ledger: string; notes: string; matterRef: string;
}) {
  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-5 space-y-4 bg-background">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Agents Financial Administration Act 2014
        </p>
        <h3 className="text-lg font-bold">Trust Account Receipt</h3>
        <Badge variant="outline" className="font-mono text-sm">{receiptNumber}</Badge>
      </div>

      <Separator />

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div>
          <span className="text-muted-foreground">Date Received:</span>
          <p className="font-medium">{dateReceived ? DATE_DISPLAY.format(new Date(dateReceived + 'T00:00:00')) : '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Date Deposited:</span>
          <p className="font-medium">{dateDeposited ? DATE_DISPLAY.format(new Date(dateDeposited + 'T00:00:00')) : 'Pending'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Client:</span>
          <p className="font-medium">{clientName || '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Property:</span>
          <p className="font-medium">{propertyAddress || '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Payment Method:</span>
          <p className="font-medium">{paymentMethod}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Purpose:</span>
          <p className="font-medium">{purpose}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ledger:</span>
          <p className="font-medium">{ledger}</p>
        </div>
        {matterRef && (
          <div>
            <span className="text-muted-foreground">Matter Ref:</span>
            <p className="font-medium">{matterRef}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Amount */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Amount Received</p>
        <p className="text-2xl font-bold text-primary">{AUD.format(amount)}</p>
        <p className="text-[10px] text-muted-foreground">GST component: {AUD.format(gstAmount)}</p>
      </div>

      {notes && (
        <>
          <Separator />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Notes</p>
            <p className="text-xs">{notes}</p>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-border pt-3 text-center">
        <p className="text-[9px] text-muted-foreground">
          DUPLICATE COPY — Retained for 5-year compliance period
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          This receipt forms part of the trust account audit trail
        </p>
      </div>
    </div>
  );
}

/* ── PDF Generation (browser-based) ── */
function generateReceiptPdf(data: {
  receiptNumber: string; dateReceived: string; dateDeposited: string | null;
  clientName: string; propertyAddress: string; amount: number; gstAmount: number;
  paymentMethod: string; purpose: string; ledger: string; notes: string;
  matterRef: string; agentName: string; agency: string; licenseNumber: string;
}) {
  const dateRecFmt = data.dateReceived ? DATE_DISPLAY.format(new Date(data.dateReceived + 'T00:00:00')) : '—';
  const dateDepFmt = data.dateDeposited ? DATE_DISPLAY.format(new Date(data.dateDeposited + 'T00:00:00')) : 'Pending';

  const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Trust Receipt ${data.receiptNumber}</title>
<style>
  @media print { @page { margin: 20mm; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px; }
  .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 30px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
  .header .act { font-size: 8px; text-transform: uppercase; letter-spacing: 3px; color: #666; margin-bottom: 6px; }
  .header h1 { font-size: 18px; margin-bottom: 4px; }
  .header .num { font-size: 14px; font-family: 'Courier New', monospace; font-weight: bold; color: #333; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 15px 0; }
  .grid .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .grid .value { font-size: 11px; font-weight: 600; margin-bottom: 6px; }
  .amount-box { text-align: center; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin: 15px 0; }
  .amount-box .amt { font-size: 24px; font-weight: bold; }
  .amount-box .gst { font-size: 9px; color: #666; margin-top: 4px; }
  .notes { background: #fafafa; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 10px; }
  .footer { border-top: 1px dashed #ccc; padding-top: 12px; margin-top: 15px; text-align: center; }
  .footer p { font-size: 8px; color: #888; margin-bottom: 3px; }
  .sig { margin-top: 25px; display: flex; justify-content: space-between; }
  .sig div { width: 45%; }
  .sig .line { border-top: 1px solid #999; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #666; }
  .duplicate { text-align: center; margin-top: 50px; border-top: 2px dashed #ccc; padding-top: 10px; }
  .duplicate p { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 2px; }
</style>
</head><body>
<div class="receipt">
  <div class="header">
    <p class="act">Agents Financial Administration Act 2014</p>
    <h1>Trust Account Receipt</h1>
    <p class="num">${data.receiptNumber}</p>
  </div>
  <div class="grid">
    <div><p class="label">Date Received</p><p class="value">${dateRecFmt}</p></div>
    <div><p class="label">Date Deposited</p><p class="value">${dateDepFmt}</p></div>
    <div><p class="label">Received From (Client)</p><p class="value">${data.clientName}</p></div>
    <div><p class="label">Property Address</p><p class="value">${data.propertyAddress}</p></div>
    <div><p class="label">Payment Method</p><p class="value">${data.paymentMethod}</p></div>
    <div><p class="label">Purpose</p><p class="value">${data.purpose}</p></div>
    <div><p class="label">Ledger Account</p><p class="value">${data.ledger}</p></div>
    ${data.matterRef ? `<div><p class="label">Client Matter Ref</p><p class="value">${data.matterRef}</p></div>` : ''}
  </div>
  <div class="amount-box">
    <p style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;">Amount Received</p>
    <p class="amt">${AUD.format(data.amount)}</p>
    <p class="gst">GST Component (1/11th): ${AUD.format(data.gstAmount)}</p>
  </div>
  ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}
  <div class="sig">
    <div>
      <p class="line">Signature of Recipient</p>
    </div>
    <div>
      <p class="line">Agent: ${data.agentName}${data.licenseNumber ? ` (Lic. ${data.licenseNumber})` : ''}</p>
    </div>
  </div>
  <div class="footer">
    ${data.agency ? `<p><strong>${data.agency}</strong></p>` : ''}
    <p>This receipt forms part of the trust account audit trail</p>
    <p>Retain for minimum 5 years per legislative requirements</p>
  </div>
</div>
<div class="duplicate">
  <p>— Duplicate Copy for Records —</p>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'width=700,height=900');
  if (!w) {
    // Fallback: download
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trust_Receipt_${data.receiptNumber}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
