import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, CheckCircle2, FileText, ShieldCheck, ArrowRight,
  ArrowLeft, Landmark, AlertTriangle, FileUp, Users, Loader2,
  Download, Printer, ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_AU = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

// ── CSV Template Definitions ──
type CsvFormat = 'generic' | 'propertyme' | 'reapit' | 'trustsoft';

const CSV_FORMATS: Record<CsvFormat, { label: string; headers: string[]; sampleRows: string[][] }> = {
  generic: {
    label: 'Generic',
    headers: ['Date', 'Client', 'Property', 'Receipt#', 'Payment#', 'In', 'Out', 'Balance'],
    sampleRows: [
      ['2026-01-15', 'John Smith', '123 Beach Rd', 'R001', '', '25000', '0', '25000'],
      ['2026-01-20', 'Sarah Jones', '456 Bay Ave', '', 'P001', '0', '5000', '20000'],
    ],
  },
  propertyme: {
    label: 'PropertyMe',
    headers: ['TransactionDate', 'ContactName', 'PropertyAddress', 'ReceiptNumber', 'PaymentNumber', 'Debit', 'Credit', 'RunningBalance'],
    sampleRows: [
      ['15/01/2026', 'John Smith', '123 Beach Rd, Bondi NSW 2026', 'TR-001', '', '25000.00', '0.00', '25000.00'],
      ['20/01/2026', 'Sarah Jones', '456 Bay Ave, Manly NSW 2095', '', 'TP-001', '0.00', '5000.00', '20000.00'],
    ],
  },
  reapit: {
    label: 'Reapit',
    headers: ['Date', 'Payee', 'Address', 'Rcpt No', 'Chq No', 'Money In', 'Money Out', 'Balance'],
    sampleRows: [
      ['15-Jan-2026', 'Smith J', '123 Beach Rd', 'REC001', '', '25000', '', '25000'],
      ['20-Jan-2026', 'Jones S', '456 Bay Ave', '', 'CHQ001', '', '5000', '20000'],
    ],
  },
  trustsoft: {
    label: 'TrustSoft',
    headers: ['TxnDate', 'ClientRef', 'PropRef', 'ReceiptRef', 'PaymentRef', 'AmountIn', 'AmountOut', 'AccBalance'],
    sampleRows: [
      ['2026/01/15', 'CLI-001 John Smith', 'PROP-001 123 Beach', 'TS-R001', '', '25000.00', '0.00', '25000.00'],
      ['2026/01/20', 'CLI-002 Sarah Jones', 'PROP-002 456 Bay', '', 'TS-P001', '0.00', '5000.00', '20000.00'],
    ],
  },
};

// Detect format from header row
function detectCsvFormat(headerLine: string): CsvFormat {
  const h = headerLine.toLowerCase();
  if (h.includes('transactiondate') && h.includes('contactname')) return 'propertyme';
  if (h.includes('payee') && h.includes('chq no')) return 'reapit';
  if (h.includes('txndate') && h.includes('clientref')) return 'trustsoft';
  return 'generic';
}

// Normalize date to YYYY-MM-DD
function normalizeDate(raw: string): string {
  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // DD-Mon-YYYY
  const dMonY = raw.match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (dMonY) {
    const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    return `${dMonY[3]}-${months[dMonY[2].toLowerCase()] || '01'}-${dMonY[1].padStart(2, '0')}`;
  }
  // YYYY/MM/DD
  const ymd = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return raw; // already ISO or best-effort
}

// Clean client name (strip TrustSoft refs like "CLI-001 John Smith")
function cleanClientName(raw: string): string {
  return raw.replace(/^[A-Z]{2,}-\d+\s+/i, '').trim();
}

function cleanPropertyName(raw: string): string {
  return raw.replace(/^[A-Z]{2,}-\d+\s+/i, '').trim();
}

interface MatterRow { client: string; property: string; deposit: number; status: string; }
interface LedgerRow { date: string; client: string; property: string; receiptNum: string; paymentNum: string; inAmount: number; outAmount: number; balance: number; }
interface TrustImportWizardProps { onComplete: () => void; onCancel: () => void; }

const STEPS = [
  { label: 'Certify Balance', icon: ShieldCheck },
  { label: 'Upload Ledger', icon: FileText },
  { label: 'Active Matters', icon: Users },
  { label: 'Confirm', icon: CheckCircle2 },
];

export default function TrustImportWizard({ onComplete, onCancel }: TrustImportWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Step 1
  const [openingBalance, setOpeningBalance] = useState('');
  const [lastReconciled, setLastReconciled] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bsb, setBsb] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Step 2
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<CsvFormat>('generic');
  const [selectedTemplate, setSelectedTemplate] = useState<CsvFormat>('generic');

  // Step 3
  const [matterRows, setMatterRows] = useState<MatterRow[]>([]);
  const [matterFile, setMatterFile] = useState<File | null>(null);

  // Computed
  const parsedBalance = parseFloat(openingBalance) || 0;
  const receiptCount = ledgerRows.filter(r => r.receiptNum).length;
  const paymentCount = ledgerRows.filter(r => r.paymentNum).length;
  const totalIn = ledgerRows.reduce((s, r) => s + r.inAmount, 0);
  const totalOut = ledgerRows.reduce((s, r) => s + r.outAmount, 0);
  const computedBalance = parsedBalance + totalIn - totalOut;
  const balanceMatches = ledgerRows.length > 0
    ? Math.abs(computedBalance - (ledgerRows[ledgerRows.length - 1]?.balance || 0)) < 0.01
    : true;

  // ── Download CSV template ──
  const downloadTemplate = (format: CsvFormat) => {
    const def = CSV_FORMATS[format];
    const csv = [def.headers.join(','), ...def.sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust_import_template_${format}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${def.label} template downloaded`);
  };

  // ── Parse ledger CSV with auto-detection ──
  const parseLedgerCsv = useCallback((file: File) => {
    setLedgerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and data'); return; }

      const format = detectCsvFormat(lines[0]);
      setDetectedFormat(format);

      const rows: LedgerRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 7) continue;
        rows.push({
          date: normalizeDate(cols[0] || ''),
          client: cleanClientName(cols[1] || ''),
          property: cleanPropertyName(cols[2] || ''),
          receiptNum: cols[3] || '',
          paymentNum: cols[4] || '',
          inAmount: parseFloat(cols[5]) || 0,
          outAmount: parseFloat(cols[6]) || 0,
          balance: parseFloat(cols[7]) || 0,
        });
      }
      setLedgerRows(rows);
      toast.success(`Parsed ${rows.length} entries (${CSV_FORMATS[format].label} format detected)`);
    };
    reader.readAsText(file);
  }, []);

  // Parse matters CSV
  const parseMattersCsv = useCallback((file: File) => {
    setMatterFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV needs header + data'); return; }
      const rows: MatterRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 3) continue;
        rows.push({ client: cols[0] || '', property: cols[1] || '', deposit: parseFloat(cols[2]) || 0, status: cols[3] || 'Pending' });
      }
      setMatterRows(rows);
      toast.success(`Parsed ${rows.length} active matters`);
    };
    reader.readAsText(file);
  }, []);

  // ── Generate Opening Balance Declaration PDF ──
  const generateDeclarationPdf = () => {
    const today = DATE_AU.format(new Date());
    const reconDate = lastReconciled ? DATE_AU.format(new Date(lastReconciled + 'T00:00:00')) : '—';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Opening Balance Declaration</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 16pt; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .header h2 { font-size: 12pt; color: #555; font-weight: normal; }
  .act-ref { text-align: center; font-size: 9pt; color: #666; font-style: italic; margin-bottom: 20px; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 10pt; }
  th { background: #f5f5f5; font-weight: 600; }
  .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; font-size: 14pt; }
  .cert-box { border: 2px solid #333; padding: 20px; margin-top: 24px; background: #fafafa; }
  .cert-box h3 { border: none; margin-bottom: 12px; }
  .cert-text { font-size: 10pt; line-height: 1.7; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-block { border-top: 1px solid #333; padding-top: 6px; margin-top: 50px; }
  .sig-label { font-size: 9pt; color: #666; }
  .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 3px; font-size: 9pt; font-weight: 600; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>Opening Balance Declaration</h1>
  <h2>Trust Account — Statutory Record</h2>
</div>
<p class="act-ref">Pursuant to the Agents Financial Administration Act 2014 (Qld) s.22, s.84<br/>
Property and Stock Agents Act 2002 (NSW) • Estate Agents Act 1980 (Vic)</p>

<div class="section">
  <h3>Account Details</h3>
  <table>
    <tr><th width="35%">Account Name</th><td>${accountName || 'Imported Trust Account'}</td></tr>
    <tr><th>BSB</th><td>${bsb || '—'}</td></tr>
    <tr><th>Account Number</th><td>${accountNumber || '—'}</td></tr>
    <tr><th>Declaration Date</th><td>${today}</td></tr>
  </table>
</div>

<div class="section">
  <h3>Certified Opening Balance</h3>
  <table>
    <tr><th width="35%">Trust Account Balance</th><td class="amount">${AUD.format(parsedBalance)}</td></tr>
    <tr><th>Last Reconciliation Date</th><td>${reconDate}</td></tr>
    <tr><th>Auditor Certification</th><td>${certFile ? `<span class="badge">✓ Uploaded: ${certFile.name}</span>` : '<span style="color:#999">Not provided</span>'}</td></tr>
  </table>
</div>

${ledgerRows.length > 0 ? `
<div class="section">
  <h3>Migration Summary</h3>
  <table>
    <tr><th width="35%">Receipts Imported</th><td>${receiptCount} (${AUD.format(totalIn)})</td></tr>
    <tr><th>Payments Imported</th><td>${paymentCount} (${AUD.format(totalOut)})</td></tr>
    <tr><th>Source Format</th><td>${CSV_FORMATS[detectedFormat].label}</td></tr>
    <tr><th>Computed Closing Balance</th><td class="amount" style="font-size:11pt">${AUD.format(computedBalance)}</td></tr>
    <tr><th>Balance Verification</th><td>${balanceMatches ? '<span class="badge">✓ Matches</span>' : '<span style="color:red;font-weight:700">⚠ Mismatch — requires investigation</span>'}</td></tr>
  </table>
</div>` : ''}

${matterRows.length > 0 ? `
<div class="section">
  <h3>Active Matters at Migration</h3>
  <table>
    <tr><th>Client</th><th>Property</th><th style="text-align:right">Deposit Held</th><th>Status</th></tr>
    ${matterRows.map(m => `<tr><td>${m.client}</td><td>${m.property}</td><td style="text-align:right;font-family:monospace">${AUD.format(m.deposit)}</td><td>${m.status}</td></tr>`).join('')}
    <tr style="font-weight:700"><td colspan="2">Total Held in Trust</td><td style="text-align:right;font-family:monospace">${AUD.format(matterRows.reduce((s, m) => s + m.deposit, 0))}</td><td></td></tr>
  </table>
</div>` : ''}

<div class="cert-box">
  <h3>Statutory Declaration</h3>
  <p class="cert-text">
    I, the undersigned, hereby declare and certify that:<br/><br/>
    1. The opening balance of <strong>${AUD.format(parsedBalance)}</strong> stated above is a true and correct record of the trust monies held as at the date of last reconciliation (<strong>${reconDate}</strong>).<br/><br/>
    2. This balance has been verified against the previous trust accounting system records and bank statements.<br/><br/>
    3. All trust monies are held in accordance with the requirements of the <em>Agents Financial Administration Act 2014</em> and applicable state legislation.<br/><br/>
    4. This declaration is made in good faith and to the best of my knowledge and belief.
  </p>
  <div class="sig-grid">
    <div>
      <div class="sig-block">
        <div class="sig-label">Signature — Licensee / Principal</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Print Name</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Date</div>
      </div>
    </div>
    <div>
      <div class="sig-block">
        <div class="sig-label">Witness Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Print Name</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  Generated ${today} • ListHQ Trust Accounting • Retain for minimum 7 years per applicable state trust accounting legislation
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=800,height=1100');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    toast.success('Opening Balance Declaration generated');
  };

  // ── Generate Migration Checklist PDF ──
  const generateChecklistPdf = () => {
    const today = DATE_AU.format(new Date());
    const items = [
      { task: 'Opening balance certified', done: parsedBalance > 0, detail: AUD.format(parsedBalance) },
      { task: 'Last reconciliation date recorded', done: !!lastReconciled, detail: lastReconciled || '—' },
      { task: 'Auditor certification uploaded', done: !!certFile, detail: certFile?.name || 'Not provided' },
      { task: 'Trust ledger CSV imported', done: ledgerRows.length > 0, detail: `${ledgerRows.length} entries` },
      { task: 'Source system identified', done: ledgerRows.length > 0, detail: CSV_FORMATS[detectedFormat].label },
      { task: 'Receipts verified', done: receiptCount > 0, detail: `${receiptCount} receipts — ${AUD.format(totalIn)}` },
      { task: 'Payments verified', done: paymentCount > 0, detail: `${paymentCount} payments — ${AUD.format(totalOut)}` },
      { task: 'Balance reconciliation check', done: balanceMatches && ledgerRows.length > 0, detail: balanceMatches ? 'Verified ✓' : 'MISMATCH — investigate' },
      { task: 'Active matters imported', done: matterRows.length > 0, detail: `${matterRows.length} matters — ${AUD.format(matterRows.reduce((s, m) => s + m.deposit, 0))} held` },
      { task: 'BSB / Account number recorded', done: !!(bsb && accountNumber), detail: bsb ? `${bsb} / ${accountNumber}` : 'Not entered' },
    ];

    const completedCount = items.filter(i => i.done).length;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Migration Compliance Checklist</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 14pt; }
  .header .meta { text-align: right; font-size: 9pt; color: #666; }
  .progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; margin-bottom: 20px; overflow: hidden; }
  .progress-fill { height: 100%; background: #2e7d32; border-radius: 4px; }
  .summary { font-size: 10pt; margin-bottom: 16px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 10pt; }
  th { background: #f5f5f5; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .check { width: 28px; text-align: center; font-size: 14pt; }
  .done { color: #2e7d32; }
  .pending { color: #ccc; }
  .detail { color: #888; font-size: 9pt; }
  .sig-section { margin-top: 40px; border-top: 2px solid #333; padding-top: 16px; }
  .sig-section h3 { font-size: 11pt; margin-bottom: 12px; }
  .sig-row { display: flex; gap: 40px; margin-top: 40px; }
  .sig-line { flex: 1; border-top: 1px solid #333; padding-top: 4px; font-size: 9pt; color: #666; }
  .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: 8px; }
  .stamp-box { border: 2px solid #2e7d32; border-radius: 4px; padding: 8px 16px; display: inline-block; margin-bottom: 16px; }
  .stamp-box span { color: #2e7d32; font-weight: 700; font-size: 11pt; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <h1>🔒 Trust Account Migration Checklist</h1>
    <p style="font-size:9pt;color:#666;margin-top:4px">Compliance Record — Agents Financial Administration Act 2014</p>
  </div>
  <div class="meta">
    Date: ${today}<br/>
    Ref: MIG-${Date.now().toString(36).toUpperCase()}
  </div>
</div>

<div class="progress-bar"><div class="progress-fill" style="width:${(completedCount / items.length) * 100}%"></div></div>
<p class="summary"><strong>${completedCount}</strong> of <strong>${items.length}</strong> checks completed</p>

<table>
  <thead><tr><th class="check">✓</th><th>Migration Task</th><th>Detail</th></tr></thead>
  <tbody>
    ${items.map(i => `<tr>
      <td class="check ${i.done ? 'done' : 'pending'}">${i.done ? '✓' : '○'}</td>
      <td>${i.task}</td>
      <td class="detail">${i.detail}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="sig-section">
  <div class="stamp-box"><span>${completedCount === items.length ? '✓ MIGRATION COMPLIANT' : '⚠ INCOMPLETE — Action Required'}</span></div>
  <h3>Agent Acknowledgement</h3>
   <p style="font-size:9pt;color:#555;line-height:1.6">
     I confirm that the above migration checklist accurately reflects the trust account data imported into ListHQ.
     I accept responsibility for verifying the accuracy of all imported records and understand that this checklist
     forms part of the statutory audit trail required under applicable Australian state trust accounting legislation (VIC: Estate Agents Act 1980 · NSW: Property and Stock Agents Act 2002 · QLD: Agents Financial Administration Act 2014 · SA: Land Agents Act 1994 · WA: Real Estate and Business Agents Act 1978). Records must be retained for a minimum of 7 years.
   </p>
  <div class="sig-row">
    <div class="sig-line">Signature</div>
    <div class="sig-line">Print Name</div>
    <div class="sig-line">License Number</div>
    <div class="sig-line">Date</div>
  </div>
</div>

<div class="footer">
  Generated ${today} • ListHQ Trust Accounting • Retain for minimum 7 years
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=800,height=1100');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    toast.success('Migration checklist generated');
  };

  // ── Migration handler ──
  const handleMigration = async () => {
    if (!user) return;
    setMigrating(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) throw new Error('Agent profile not found');

      const { data: account, error: accErr } = await supabase
        .from('trust_accounts')
        .insert({
          agent_id: agent.id,
          account_name: accountName || 'Imported Trust Account',
          account_type: 'trust',
          opening_balance: parsedBalance,
          current_balance: parsedBalance,
          balance: parsedBalance,
          bsb: bsb || null,
          account_number: accountNumber || null,
          bank_name: bankName || null,
        } as any)
        .select()
        .maybeSingle();
      if (accErr) throw accErr;
      if (!accData) throw new Error('Failed to create trust account — no data returned');

      await supabase.from('trust_account_balances').insert({
        agent_id: agent.id,
        opening_balance: parsedBalance,
        current_balance: computedBalance,
        last_reconciled_date: lastReconciled || null,
      } as any);

      const receiptInserts = ledgerRows
        .filter(r => r.receiptNum && r.inAmount > 0)
        .map((r, i) => ({
          agent_id: agent.id,
          receipt_number: r.receiptNum || `IMP-R${String(i + 1).padStart(3, '0')}`,
          client_name: r.client,
          property_address: r.property,
          amount: r.inAmount,
          payment_method: 'eft',
          purpose: 'deposit',
          date_received: r.date || new Date().toISOString().split('T')[0],
          status: 'deposited',
        }));
      if (receiptInserts.length > 0) {
        const { error } = await supabase.from('trust_receipts').insert(receiptInserts as any);
        if (error) throw error;
      }

      const paymentInserts = ledgerRows
        .filter(r => r.paymentNum && r.outAmount > 0)
        .map((r, i) => ({
          agent_id: agent.id,
          payment_number: r.paymentNum || `IMP-P${String(i + 1).padStart(3, '0')}`,
          client_name: r.client,
          property_address: r.property,
          amount: r.outAmount,
          payment_method: 'eft',
          purpose: 'refund',
          date_paid: r.date || new Date().toISOString().split('T')[0],
          status: 'cleared',
        }));
      if (paymentInserts.length > 0) {
        const { error } = await supabase.from('trust_payments').insert(paymentInserts as any);
        if (error) throw error;
      }

      if (certFile) {
        const filePath = `trust-imports/${agent.id}/${Date.now()}_${certFile.name}`;
        await supabase.storage.from('agent-documents').upload(filePath, certFile);
      }

      setMigrationComplete(true);
      toast.success('Trust account migration completed!');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || 'Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return parsedBalance > 0 && lastReconciled;
      case 1: return ledgerRows.length > 0;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  // ── Post-migration success screen ──
  if (migrationComplete) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Migration Complete</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your trust account is live. Download your compliance documents before continuing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <Button variant="outline" onClick={generateDeclarationPdf} className="gap-2">
                <FileText size={14} /> Opening Balance Declaration
              </Button>
              <Button variant="outline" onClick={generateChecklistPdf} className="gap-2">
                <ClipboardCheck size={14} /> Migration Checklist
              </Button>
            </div>

            <div className="pt-4">
              <Button onClick={onComplete} className="gap-2 px-8">
                Go to Dashboard <ArrowRight size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="py-2 px-4 rounded-lg bg-muted/50 border border-border flex items-center justify-center gap-2">
          <ShieldCheck size={12} className="text-primary shrink-0" />
          <p className="text-[10px] text-muted-foreground text-center">
            All-state compliant • Documents retained for audit • 7-year minimum
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Landmark size={20} className="text-primary" />
            Import Trust Account
          </h2>
          <Badge variant="outline" className="text-xs">Step {step + 1} of {STEPS.length}</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${
                isDone ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 size={14} className="text-primary" /> : <Icon size={14} />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* ── STEP 1: Certify Balance ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <ShieldCheck size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Certify Opening Balance</h3>
                <p className="text-xs text-muted-foreground">Enter the current trust balance from your existing system</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Account name</Label>
                <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Smith & Co Trust Account" className="mt-1.5 h-10" />
              </div>

              <div>
                <Label className="text-xs font-medium">Bank name</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Commonwealth Bank" className="mt-1.5 h-10" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">BSB</Label>
                  <Input value={bsb} onChange={e => setBsb(e.target.value)} placeholder="062-000" className="mt-1.5 h-10 font-mono" maxLength={7} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Account number</Label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="12345678" className="mt-1.5 h-10 font-mono" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Current balance in old system *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <Input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="47,230.00" className="pl-7 text-lg font-semibold h-12" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Last reconciled date *</Label>
                <Input type="date" value={lastReconciled} onChange={e => setLastReconciled(e.target.value)} className="mt-1.5 h-10" />
              </div>

              <div>
                <Label className="text-xs font-medium">Auditor certification (PDF/letter)</Label>
                <div
                  className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('cert-file-input')?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); const f = e.dataTransfer.files[0]; if (f) setCertFile(f); }}
                >
                  <input id="cert-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={e => setCertFile(e.target.files?.[0] || null)} />
                  {certFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <span className="text-sm font-medium">{certFile.name}</span>
                      <CheckCircle2 size={14} className="text-primary" />
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Drag PDF/letter or click to upload</p>
                    </>
                  )}
                </div>
              </div>

              {parsedBalance > 0 && lastReconciled && (
                <Button variant="outline" size="sm" onClick={generateDeclarationPdf} className="w-full gap-2">
                  <Printer size={14} /> Preview Opening Balance Declaration PDF
                </Button>
              )}
            </div>
          )}

          {/* ── STEP 2: Upload Ledger ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-4">
                <FileUp size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Upload Trust Ledger CSV</h3>
                <p className="text-xs text-muted-foreground">We auto-detect PropertyMe, Reapit, and TrustSoft formats</p>
              </div>

              {/* Template download */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
                <p className="text-xs font-medium">Download a CSV template for your software:</p>
                <div className="flex items-center gap-2">
                  <Select value={selectedTemplate} onValueChange={v => setSelectedTemplate(v as CsvFormat)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generic">Generic</SelectItem>
                      <SelectItem value="propertyme">PropertyMe</SelectItem>
                      <SelectItem value="reapit">Reapit</SelectItem>
                      <SelectItem value="trustsoft">TrustSoft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate(selectedTemplate)} className="gap-1.5 h-8 text-xs shrink-0">
                    <Download size={12} /> Download Template
                  </Button>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {CSV_FORMATS[selectedTemplate].headers.join(', ')}
                </p>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('ledger-file-input')?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); const f = e.dataTransfer.files[0]; if (f) parseLedgerCsv(f); }}
              >
                <input id="ledger-file-input" type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) parseLedgerCsv(e.target.files[0]); }} />
                {ledgerFile ? (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <FileText size={16} className="text-primary" />
                    <span className="text-sm font-medium">{ledgerFile.name}</span>
                    <Badge className="text-[10px]">{ledgerRows.length} entries</Badge>
                    <Badge variant="outline" className="text-[10px]">{CSV_FORMATS[detectedFormat].label} format</Badge>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Drag CSV from PropertyMe / Reapit / TrustSoft</p>
                    <p className="text-xs text-muted-foreground mt-1">Format is auto-detected</p>
                  </>
                )}
              </div>

              {ledgerRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Preview (first 5 rows)</span>
                    <div className="flex gap-3">
                      <span>Receipts: <strong>{receiptCount}</strong></span>
                      <span>Payments: <strong>{paymentCount}</strong></span>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Date</TableHead>
                          <TableHead className="text-[10px]">Client</TableHead>
                          <TableHead className="text-[10px]">Property</TableHead>
                          <TableHead className="text-[10px]">Receipt#</TableHead>
                          <TableHead className="text-[10px]">Payment#</TableHead>
                          <TableHead className="text-[10px] text-right">In</TableHead>
                          <TableHead className="text-[10px] text-right">Out</TableHead>
                          <TableHead className="text-[10px] text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerRows.slice(0, 5).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-[10px]">{r.date}</TableCell>
                            <TableCell className="text-[10px] font-medium">{r.client}</TableCell>
                            <TableCell className="text-[10px] max-w-[120px] truncate">{r.property}</TableCell>
                            <TableCell className="text-[10px] font-mono">{r.receiptNum}</TableCell>
                            <TableCell className="text-[10px] font-mono">{r.paymentNum}</TableCell>
                            <TableCell className="text-[10px] text-right text-green-600">{r.inAmount > 0 ? AUD.format(r.inAmount) : ''}</TableCell>
                            <TableCell className="text-[10px] text-right text-destructive">{r.outAmount > 0 ? AUD.format(r.outAmount) : ''}</TableCell>
                            <TableCell className="text-[10px] text-right font-bold">{AUD.format(r.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {ledgerRows.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center">…and {ledgerRows.length - 5} more entries</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Active Matters ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <Users size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Upload Active Matters</h3>
                <p className="text-xs text-muted-foreground">Import clients with deposits currently held in trust</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  CSV format: Client Name,Property,Deposit Held,Status
                </p>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('matters-file-input')?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); const f = e.dataTransfer.files[0]; if (f) parseMattersCsv(f); }}
              >
                <input id="matters-file-input" type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) parseMattersCsv(e.target.files[0]); }} />
                {matterFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-sm font-medium">{matterFile.name}</span>
                    <Badge className="text-[10px]">{matterRows.length} matters</Badge>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Drag CSV or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Optional — you can add matters manually later</p>
                  </>
                )}
              </div>

              {matterRows.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Client Name</TableHead>
                        <TableHead className="text-[10px]">Property</TableHead>
                        <TableHead className="text-[10px] text-right">Deposit Held</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matterRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{r.client}</TableCell>
                          <TableCell className="text-xs">{r.property}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{AUD.format(r.deposit)}</TableCell>
                          <TableCell>
                            <Badge variant={r.status.toLowerCase() === 'settled' ? 'secondary' : 'outline'} className="text-[10px]">{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Confirm ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <CheckCircle2 size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Confirm Migration</h3>
                <p className="text-xs text-muted-foreground">Review your import before going live</p>
              </div>

              <div className="space-y-2">
                <MigrationCheckItem label={`${receiptCount} trust receipts imported`} checked={receiptCount > 0} detail={`Total: ${AUD.format(totalIn)}`} />
                <MigrationCheckItem label={`${paymentCount} trust payments imported`} checked={paymentCount > 0} detail={`Total: ${AUD.format(totalOut)}`} />
                <MigrationCheckItem label={`Opening balance certified ${AUD.format(parsedBalance)}`} checked={parsedBalance > 0} detail={`Last reconciled: ${lastReconciled || '—'}`} />
                <MigrationCheckItem label="Bank reconciliation matches" checked={balanceMatches} detail={balanceMatches ? `Computed: ${AUD.format(computedBalance)}` : `Mismatch: computed ${AUD.format(computedBalance)}`} warning={!balanceMatches} />
                {matterRows.length > 0 && <MigrationCheckItem label={`${matterRows.length} active matters loaded`} checked detail={`Total held: ${AUD.format(matterRows.reduce((s, m) => s + m.deposit, 0))}`} />}
                {certFile && <MigrationCheckItem label="Auditor certification uploaded" checked detail={certFile.name} />}
                <MigrationCheckItem label={`Source: ${CSV_FORMATS[detectedFormat].label}`} checked={ledgerRows.length > 0} detail={`${ledgerRows.length} ledger entries parsed`} />
              </div>

              {!balanceMatches && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    Balance mismatch detected. The computed balance ({AUD.format(computedBalance)}) doesn't match the final CSV balance. You can still proceed, but this should be investigated.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generateDeclarationPdf} className="flex-1 gap-1.5 text-xs">
                  <FileText size={12} /> Declaration PDF
                </Button>
                <Button variant="outline" size="sm" onClick={generateChecklistPdf} className="flex-1 gap-1.5 text-xs">
                  <ClipboardCheck size={12} /> Checklist PDF
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground">
                  <ShieldCheck size={12} className="inline mr-1" />
                  Your agent dashboard will be live instantly after migration
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} className="gap-1.5">
          <ArrowLeft size={14} />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1.5">
            Continue <ArrowRight size={14} />
          </Button>
        ) : (
          <Button onClick={handleMigration} disabled={migrating} className="gap-1.5 px-6">
            {migrating ? <><Loader2 size={14} className="animate-spin" /> Migrating…</> : <><CheckCircle2 size={14} /> Complete Migration</>}
          </Button>
        )}
      </div>

      {/* Compliance Footer */}
      <div className="py-2 px-4 rounded-lg bg-muted/50 border border-border flex items-center justify-center gap-2">
        <ShieldCheck size={12} className="text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground text-center">
          All-state compliant • Audit trail preserved • 7-year retention
        </p>
      </div>
    </div>
  );
}

function MigrationCheckItem({ label, checked, detail, warning }: {
  label: string; checked: boolean; detail?: string; warning?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${
      warning ? 'border-destructive/30 bg-destructive/5' : checked ? 'border-primary/30 bg-primary/5' : 'border-border'
    }`}>
      {warning ? <AlertTriangle size={16} className="text-destructive shrink-0" /> : <CheckCircle2 size={16} className={checked ? 'text-primary' : 'text-muted-foreground'} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
