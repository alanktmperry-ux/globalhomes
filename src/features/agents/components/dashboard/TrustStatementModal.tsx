import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Printer, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Receipt {
  receipt_number: string;
  client_name: string;
  property_address: string;
  amount: number;
  payment_method: string;
  purpose: string;
  date_received: string;
  status: string;
}

interface Payment {
  payment_number: string;
  client_name: string;
  property_address: string;
  amount: number;
  payment_method: string;
  purpose: string;
  date_paid: string;
  status: string;
  payee_name: string | null;
  reference: string | null;
}

interface TrustStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrustStatementModal({ open, onOpenChange }: TrustStatementModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [agentInfo, setAgentInfo] = useState<{ name: string; agency: string; license_number: string } | null>(null);

  // Month picker
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth())); // 0-indexed

  const year = parseInt(selectedYear);
  const month = parseInt(selectedMonth);
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`;

  // Available years
  const years = useMemo(() => {
    const y = [];
    for (let i = now.getFullYear(); i >= now.getFullYear() - 3; i--) y.push(String(i));
    return y;
  }, []);

  const fetchStatementData = useCallback(async () => {
    if (!user || !open) return;
    setLoading(true);

    const [{ data: agent }, { data: recs }, { data: pays }] = await Promise.all([
      supabase.from('agents').select('name, agency, license_number').eq('user_id', user.id).maybeSingle(),
      supabase.from('trust_receipts')
        .select('receipt_number, client_name, property_address, amount, payment_method, purpose, date_received, status')
        .gte('date_received', startDate)
        .lt('date_received', endDate)
        .order('date_received'),
      supabase.from('trust_payments')
        .select('payment_number, client_name, property_address, amount, payment_method, purpose, date_paid, status, payee_name, reference')
        .gte('date_paid', startDate)
        .lt('date_paid', endDate)
        .order('date_paid'),
    ]);

    if (agent) setAgentInfo(agent as any);
    setReceipts((recs || []) as unknown as Receipt[]);
    setPayments((pays || []) as unknown as Payment[]);

    // Fetch period opening balance
    const { data: agentRow } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (agentRow) {
      const { data: acct } = await supabase.from('trust_accounts').select('id').eq('agent_id', (agentRow as any).id).limit(1).maybeSingle();
      if (acct) {
        const { data: bal } = await supabase
          .from('trust_account_balances')
          .select('opening_balance')
          .eq('trust_account_id', (acct as any).id)
          .eq('period_year', year)
          .eq('period_month', month + 1)
          .maybeSingle();
        setOpeningBalance((bal as any)?.opening_balance ?? 0);
      } else {
        setOpeningBalance(0);
      }
    } else {
      setOpeningBalance(0);
    }

    setLoading(false);
  }, [user, open, startDate, endDate, year, month]);

  useEffect(() => { fetchStatementData(); }, [fetchStatementData]);

  const totalIn = receipts.reduce((s, r) => s + r.amount, 0);
  const totalOut = payments.reduce((s, p) => s + p.amount, 0);
  const closingBalance = openingBalance + totalIn - totalOut;
  const gstOnReceipts = totalIn / 11;
  const gstOnPayments = totalOut / 11;

  const handleGeneratePdf = () => {
    const agentName = agentInfo?.name || 'Agent';
    const agency = agentInfo?.agency || '';
    const license = agentInfo?.license_number || '';
    const generatedAt = DATE_FMT.format(new Date());

    const receiptRows = receipts.map(r => `
      <tr>
        <td>${r.receipt_number}</td>
        <td>${DATE_FMT.format(new Date(r.date_received + 'T00:00:00'))}</td>
        <td>${r.client_name}</td>
        <td class="truncate">${r.property_address}</td>
        <td class="cap">${r.purpose}</td>
        <td class="cap">${r.payment_method}</td>
        <td class="right green">${AUD.format(r.amount)}</td>
      </tr>
    `).join('');

    const paymentRows = payments.map(p => `
      <tr>
        <td>${p.payment_number}</td>
        <td>${DATE_FMT.format(new Date(p.date_paid + 'T00:00:00'))}</td>
        <td>${p.payee_name || p.client_name}</td>
        <td class="truncate">${p.property_address}</td>
        <td class="cap">${p.purpose}</td>
        <td class="cap">${p.payment_method}</td>
        <td class="right red">${AUD.format(p.amount)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Trust Account Statement — ${monthLabel}</title>
<style>
  @media print { @page { margin: 15mm; size: A4; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 30px; }
  .statement { max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #1a1a1a; }
  .header-left h1 { font-size: 16px; margin-bottom: 2px; }
  .header-left .act { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 6px; }
  .header-left .period { font-size: 12px; font-weight: 600; color: #333; }
  .header-right { text-align: right; font-size: 9px; color: #666; }
  .header-right strong { color: #1a1a1a; font-size: 10px; }

  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
  .sum-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
  .sum-box .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
  .sum-box .value { font-size: 16px; font-weight: bold; }
  .sum-box .sub { font-size: 8px; color: #888; margin-top: 2px; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }

  h2 { font-size: 12px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #888; padding: 6px 8px; border-bottom: 1px solid #ddd; }
  td { padding: 5px 8px; font-size: 9px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .right { text-align: right; }
  .cap { text-transform: capitalize; }
  .truncate { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .total-row td { border-top: 2px solid #1a1a1a; font-weight: bold; font-size: 10px; padding-top: 8px; }

  .closing { text-align: center; margin: 25px 0; padding: 15px; border: 2px solid #1a1a1a; border-radius: 8px; }
  .closing .label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
  .closing .amount { font-size: 24px; font-weight: bold; margin: 5px 0; }

  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
  .footer p { font-size: 8px; color: #888; margin-bottom: 3px; }
  .sig-area { display: flex; justify-content: space-between; margin-top: 30px; }
  .sig-area div { width: 40%; }
  .sig-line { border-top: 1px solid #999; margin-top: 40px; padding-top: 4px; font-size: 9px; color: #666; }

  .compliance { background: #f8f8f8; border-radius: 6px; padding: 10px 12px; margin: 15px 0; font-size: 8px; color: #666; }
  .compliance strong { color: #1a1a1a; }
</style>
</head><body>
<div class="statement">
  <div class="header">
    <div class="header-left">
      <p class="act">Agents Financial Administration Act 2014</p>
      <h1>Trust Account Statement</h1>
      <p class="period">${monthLabel}</p>
    </div>
    <div class="header-right">
      <strong>${agency || 'ListHQ'}</strong><br>
      ${agentName}${license ? `<br>Licence: ${license}` : ''}<br>
      Generated: ${generatedAt}
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="sum-box">
      <p class="label">Opening Balance</p>
      <p class="value">${AUD.format(openingBalance)}</p>
      <p class="sub">Start of ${MONTH_NAMES[month]}</p>
    </div>
    <div class="sum-box">
      <p class="label">Total Receipts</p>
      <p class="value green">${AUD.format(totalIn)}</p>
      <p class="sub">${receipts.length} transaction${receipts.length !== 1 ? 's' : ''} · GST: ${AUD.format(gstOnReceipts)}</p>
    </div>
    <div class="sum-box">
      <p class="label">Total Payments</p>
      <p class="value red">${AUD.format(totalOut)}</p>
      <p class="sub">${payments.length} transaction${payments.length !== 1 ? 's' : ''} · GST: ${AUD.format(gstOnPayments)}</p>
    </div>
    <div class="sum-box" style="border-color:#1a1a1a;border-width:2px;">
      <p class="label">Closing Balance</p>
      <p class="value">${AUD.format(closingBalance)}</p>
      <p class="sub">End of ${MONTH_NAMES[month]}</p>
    </div>
  </div>

  <!-- Receipts -->
  <h2>Trust Receipts (Money In)</h2>
  ${receipts.length === 0 ? '<p style="font-size:9px;color:#888;padding:8px 0;">No receipts recorded this period.</p>' : `
  <table>
    <thead><tr>
      <th>Receipt #</th><th>Date</th><th>Client</th><th>Property</th><th>Purpose</th><th>Method</th><th class="right">Amount</th>
    </tr></thead>
    <tbody>
      ${receiptRows}
      <tr class="total-row">
        <td colspan="6">Total Receipts</td>
        <td class="right green">${AUD.format(totalIn)}</td>
      </tr>
    </tbody>
  </table>`}

  <!-- Payments -->
  <h2>Trust Payments (Money Out)</h2>
  ${payments.length === 0 ? '<p style="font-size:9px;color:#888;padding:8px 0;">No payments recorded this period.</p>' : `
  <table>
    <thead><tr>
      <th>Payment #</th><th>Date</th><th>Payee</th><th>Property</th><th>Purpose</th><th>Method</th><th class="right">Amount</th>
    </tr></thead>
    <tbody>
      ${paymentRows}
      <tr class="total-row">
        <td colspan="6">Total Payments</td>
        <td class="right red">${AUD.format(totalOut)}</td>
      </tr>
    </tbody>
  </table>`}

  <!-- Closing Balance -->
  <div class="closing">
    <p class="label">Closing Trust Account Balance</p>
    <p class="amount ${closingBalance >= 0 ? 'green' : 'red'}">${AUD.format(closingBalance)}</p>
    <p style="font-size:9px;color:#666;">As at end of ${monthLabel}</p>
  </div>

  <!-- GST Summary -->
  <div class="compliance">
    <strong>GST Summary (1/11th method)</strong><br>
    GST collected on receipts: ${AUD.format(gstOnReceipts)}<br>
    GST paid on disbursements: ${AUD.format(gstOnPayments)}<br>
    Net GST position: ${AUD.format(gstOnReceipts - gstOnPayments)}
  </div>

  <!-- Signatures -->
  <div class="sig-area">
    <div>
      <p class="sig-line">Licensee / Principal Signature</p>
    </div>
    <div>
      <p class="sig-line">Date</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>Compliance Notice:</strong> This statement is prepared in accordance with the Agents Financial Administration Act 2014 (Qld) and the Property Occupations Act 2014.</p>
    <p>Trust account records must be retained for a minimum of 5 years from the date of the last entry.</p>
    <p>This document forms part of the statutory audit trail. Any discrepancies must be reported to the Chief Executive within 5 business days.</p>
    <p style="margin-top:6px;font-size:7px;color:#aaa;">Generated by ListHQ Trust Accounting · ${generatedAt}</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'width=900,height=1100');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trust_Statement_${monthLabel.replace(' ', '_')}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success(`Statement generated for ${monthLabel}`);
  };

  // ── Email statement to a recipient ──────────────────────
  const [emailTo, setEmailTo] = useState('');
  const [emailing, setEmailing] = useState(false);

  const handleEmailStatement = async () => {
    if (!emailTo.trim() || !agentInfo) return;
    setEmailing(true);

    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user?.id || '')
        .single();

      if (!agent) throw new Error('Agent not found');

      const totalIn = receipts.reduce((s, r) => s + r.amount, 0);
      const totalOut = payments.reduce((s, p) => s + p.amount, 0);

      await supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: agent.id,
          type: 'trust_statement',
          title: `Trust Account Statement — ${monthLabel}`,
          message: [
            `Trust Account Statement for ${monthLabel}`,
            `Agent: ${agentInfo.name} — ${agentInfo.agency}`,
            `Licence: ${agentInfo.license_number || 'N/A'}`,
            ``,
            `Receipts: ${receipts.length} totalling ${AUD.format(totalIn)}`,
            `Payments: ${payments.length} totalling ${AUD.format(totalOut)}`,
            `Net: ${AUD.format(totalIn - totalOut)}`,
            ``,
            `This statement was generated by ListHQ Trust Accounting.`,
            `Please log in to your dashboard to view the full statement with line items.`,
          ].join('\n'),
          recipient_email: emailTo.trim(),
        },
      });

      toast.success(`Statement emailed to ${emailTo.trim()}`);
      setEmailTo('');
    } catch (err: unknown) {
      toast.error(`Email failed — ${getErrorMessage(err) || 'Please try again'}`);
    } finally {
      setEmailing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">End-of-Month Trust Statement</DialogTitle>
              <DialogDescription className="text-xs">
                Generate a compliance-ready trust account statement
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Month Selector */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1.5">
              <Calendar size={12} className="text-muted-foreground" /> Month
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1.5">
              <Calendar size={12} className="text-muted-foreground" /> Year
            </Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading statement data…</div>
        ) : (
          <>
            {/* Preview Summary */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                  Trust Account Statement
                </p>
                <h3 className="text-lg font-bold">{monthLabel}</h3>
                {agentInfo && (
                  <p className="text-xs text-muted-foreground">
                    {agentInfo.agency || 'ListHQ'} — {agentInfo.name}
                  </p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold">Opening</p>
                  <p className="text-lg font-bold">{AUD.format(openingBalance)}</p>
                  <p className="text-[10px] text-muted-foreground">Start of period</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold">Receipts</p>
                  <p className="text-lg font-bold text-green-600">{AUD.format(totalIn)}</p>
                  <p className="text-[10px] text-muted-foreground">{receipts.length} entries</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold">Payments</p>
                  <p className="text-lg font-bold text-destructive">{AUD.format(totalOut)}</p>
                  <p className="text-[10px] text-muted-foreground">{payments.length} entries</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg ring-2 ring-primary/20">
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold">Closing Balance</p>
                  <p className={`text-lg font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {AUD.format(closingBalance)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">End of period</p>
                </div>
              </div>

              <Separator />

              {/* GST Summary */}
              <div className="bg-muted/40 rounded-lg p-3 text-xs">
                <p className="font-semibold text-foreground mb-1">GST Summary (1/11th)</p>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <div>
                    <p className="text-[9px] uppercase">Collected</p>
                    <p className="font-medium text-foreground">{AUD.format(gstOnReceipts)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase">Paid</p>
                    <p className="font-medium text-foreground">{AUD.format(gstOnPayments)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase">Net GST</p>
                    <p className="font-medium text-foreground">{AUD.format(gstOnReceipts - gstOnPayments)}</p>
                  </div>
                </div>
              </div>

              {/* Receipt list preview */}
              {receipts.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
                    Receipts ({receipts.length})
                  </p>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {receipts.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[9px] shrink-0">{r.receipt_number}</Badge>
                          <span className="truncate">{r.client_name}</span>
                        </div>
                        <span className="font-semibold text-green-600 shrink-0 ml-2">{AUD.format(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment list preview */}
              {payments.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
                    Payments ({payments.length})
                  </p>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[9px] shrink-0">{p.payment_number}</Badge>
                          <span className="truncate">{p.payee_name || p.client_name}</span>
                        </div>
                        <span className="font-semibold text-destructive shrink-0 ml-2">{AUD.format(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {receipts.length === 0 && payments.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No trust activity recorded for {monthLabel}.
                </div>
              )}
            </div>

            {/* Compliance note */}
            <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3 border border-border">
              <FileText size={14} className="text-primary mt-0.5 shrink-0" />
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-0.5">Compliance Notice</p>
                <p>
                  Statement complies with the <strong>Agents Financial Administration Act 2014</strong> and
                  <strong> Property Occupations Act 2014</strong>. Includes GST summary, sequential receipt/payment
                  numbers, and signature lines. Retain for minimum 5 years.
                </p>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex items-center gap-2 w-full">
            <input
              type="email"
              placeholder="Email statement to…"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmailStatement}
              disabled={emailing || !emailTo.trim() || loading}
              className="gap-1.5 shrink-0"
            >
              {emailing ? 'Sending…' : 'Email'}
            </Button>
          </div>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleGeneratePdf} disabled={loading} className="gap-1.5">
              <Printer size={14} />
              Generate & Print Statement
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
