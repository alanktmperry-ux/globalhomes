import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Upload, CheckCircle2, FileText, ShieldCheck, ArrowRight,
  ArrowLeft, Landmark, AlertTriangle, FileUp, Users, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from 'sonner';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });

interface MatterRow {
  client: string;
  property: string;
  deposit: number;
  status: string;
}

interface LedgerRow {
  date: string;
  client: string;
  property: string;
  receiptNum: string;
  paymentNum: string;
  inAmount: number;
  outAmount: number;
  balance: number;
}

interface TrustImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

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

  // Step 1: Opening balance
  const [openingBalance, setOpeningBalance] = useState('');
  const [lastReconciled, setLastReconciled] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  // Step 2: Ledger CSV
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);

  // Step 3: Active matters
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

  // Parse ledger CSV
  const parseLedgerCsv = useCallback((file: File) => {
    setLedgerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and data'); return; }

      const header = lines[0].toLowerCase();
      const hasExpectedCols = header.includes('date') && header.includes('client');

      if (!hasExpectedCols) { toast.error('CSV must include Date, Client columns'); return; }

      const rows: LedgerRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 7) continue;
        rows.push({
          date: cols[0] || '',
          client: cols[1] || '',
          property: cols[2] || '',
          receiptNum: cols[3] || '',
          paymentNum: cols[4] || '',
          inAmount: parseFloat(cols[5]) || 0,
          outAmount: parseFloat(cols[6]) || 0,
          balance: parseFloat(cols[7]) || 0,
        });
      }
      setLedgerRows(rows);
      toast.success(`Parsed ${rows.length} ledger entries`);
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
        rows.push({
          client: cols[0] || '',
          property: cols[1] || '',
          deposit: parseFloat(cols[2]) || 0,
          status: cols[3] || 'Pending',
        });
      }
      setMatterRows(rows);
      toast.success(`Parsed ${rows.length} active matters`);
    };
    reader.readAsText(file);
  }, []);

  // Complete migration
  const handleMigration = async () => {
    if (!user) return;
    setMigrating(true);

    try {
      // Get agent
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!agent) throw new Error('Agent profile not found');

      // 1. Create trust account with opening balance
      const { data: account, error: accErr } = await supabase
        .from('trust_accounts')
        .insert({
          agent_id: agent.id,
          account_name: 'Imported Trust Account',
          account_type: 'trust',
          balance: parsedBalance,
        } as any)
        .select()
        .single();
      if (accErr) throw accErr;

      // 2. Set trust_account_balances
      await supabase.from('trust_account_balances').insert({
        agent_id: agent.id,
        opening_balance: parsedBalance,
        current_balance: computedBalance,
        last_reconciled_date: lastReconciled || null,
      } as any);

      // 3. Import receipts
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

      // 4. Import payments
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

      // 5. Upload certification file if provided
      if (certFile) {
        const filePath = `trust-imports/${agent.id}/${Date.now()}_${certFile.name}`;
        await supabase.storage.from('agent-documents').upload(filePath, certFile);
      }

      toast.success('Trust account migration completed successfully!');
      onComplete();
    } catch (e: any) {
      toast.error(e.message || 'Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return parsedBalance > 0 && lastReconciled;
      case 1: return ledgerRows.length > 0;
      case 2: return true; // matters are optional
      case 3: return true;
      default: return false;
    }
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

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
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <ShieldCheck size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Certify Opening Balance</h3>
                <p className="text-xs text-muted-foreground">Enter the current trust balance from your existing system (PropertyMe, Reapit, etc.)</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Current balance in old system *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    placeholder="47,230.00"
                    className="pl-7 text-lg font-semibold h-12"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Last reconciled date *</Label>
                <Input
                  type="date"
                  value={lastReconciled}
                  onChange={e => setLastReconciled(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Auditor certification (PDF/letter)</Label>
                <div
                  className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('cert-file-input')?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary');
                    const file = e.dataTransfer.files[0];
                    if (file) setCertFile(file);
                  }}
                >
                  <input
                    id="cert-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    className="hidden"
                    onChange={e => setCertFile(e.target.files?.[0] || null)}
                  />
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
                      <p className="text-[10px] text-muted-foreground mt-1">Optional but recommended for audit compliance</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <FileUp size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Upload Trust Ledger CSV</h3>
                <p className="text-xs text-muted-foreground">Export from PropertyMe, Reapit, or any trust software</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  Expected CSV format:<br />
                  Date,Client,Property,Receipt#,Payment#,In,Out,Balance
                </p>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('ledger-file-input')?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary');
                  const file = e.dataTransfer.files[0];
                  if (file) parseLedgerCsv(file);
                }}
              >
                <input
                  id="ledger-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) parseLedgerCsv(e.target.files[0]); }}
                />
                {ledgerFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-sm font-medium">{ledgerFile.name}</span>
                    <Badge className="text-[10px]">{ledgerRows.length} entries</Badge>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Drag CSV from PropertyMe / Reapit</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to choose file</p>
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
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary');
                  const file = e.dataTransfer.files[0];
                  if (file) parseMattersCsv(file);
                }}
              >
                <input
                  id="matters-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) parseMattersCsv(e.target.files[0]); }}
                />
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
                            <Badge variant={r.status.toLowerCase() === 'settled' ? 'secondary' : 'outline'} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-1 mb-6">
                <CheckCircle2 size={32} className="mx-auto text-primary" />
                <h3 className="text-base font-bold">Confirm Migration</h3>
                <p className="text-xs text-muted-foreground">Review your import before going live</p>
              </div>

              <div className="space-y-2">
                <MigrationCheckItem
                  label={`${receiptCount} trust receipts imported`}
                  checked={receiptCount > 0}
                  detail={`Total: ${AUD.format(totalIn)}`}
                />
                <MigrationCheckItem
                  label={`${paymentCount} trust payments imported`}
                  checked={paymentCount > 0}
                  detail={`Total: ${AUD.format(totalOut)}`}
                />
                <MigrationCheckItem
                  label={`Opening balance certified ${AUD.format(parsedBalance)}`}
                  checked={parsedBalance > 0}
                  detail={`Last reconciled: ${lastReconciled || '—'}`}
                />
                <MigrationCheckItem
                  label="Bank reconciliation matches"
                  checked={balanceMatches}
                  detail={balanceMatches
                    ? `Computed: ${AUD.format(computedBalance)}`
                    : `Mismatch: computed ${AUD.format(computedBalance)}`}
                  warning={!balanceMatches}
                />
                {matterRows.length > 0 && (
                  <MigrationCheckItem
                    label={`${matterRows.length} active matters loaded`}
                    checked
                    detail={`Total held: ${AUD.format(matterRows.reduce((s, m) => s + m.deposit, 0))}`}
                  />
                )}
                {certFile && (
                  <MigrationCheckItem
                    label="Auditor certification uploaded"
                    checked
                    detail={certFile.name}
                  />
                )}
              </div>

              {!balanceMatches && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    Balance mismatch detected. The computed balance ({AUD.format(computedBalance)}) doesn't match the final CSV balance.
                    You can still proceed, but this should be investigated.
                  </p>
                </div>
              )}

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
        <Button
          variant="outline"
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className="gap-1.5"
        >
          <ArrowLeft size={14} />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="gap-1.5"
          >
            Continue <ArrowRight size={14} />
          </Button>
        ) : (
          <Button
            onClick={handleMigration}
            disabled={migrating}
            className="gap-1.5 px-6"
          >
            {migrating ? (
              <><Loader2 size={14} className="animate-spin" /> Migrating…</>
            ) : (
              <><CheckCircle2 size={14} /> Complete Migration</>
            )}
          </Button>
        )}
      </div>

      {/* Compliance Footer */}
      <div className="py-2 px-4 rounded-lg bg-muted/50 border border-border flex items-center justify-center gap-2">
        <ShieldCheck size={12} className="text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground text-center">
          AFA 2014 compliant • Audit trail preserved • 5-year retention
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
      {warning ? (
        <AlertTriangle size={16} className="text-destructive shrink-0" />
      ) : (
        <CheckCircle2 size={16} className={checked ? 'text-primary' : 'text-muted-foreground'} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
