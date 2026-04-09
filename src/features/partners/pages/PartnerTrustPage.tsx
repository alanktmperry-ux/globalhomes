import { useState, useEffect, useCallback } from 'react';
import { usePartner } from './PartnerDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Building2, DollarSign, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Receipt } from 'lucide-react';
import TrustReceiptModal from '@/features/agents/components/dashboard/TrustReceiptModal';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 });
const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  completed: { variant: 'default', label: 'Cleared' },
  reconciled: { variant: 'secondary', label: 'Reconciled' },
  voided: { variant: 'destructive', label: 'Voided' },
};

interface TrustAccount {
  id: string;
  account_name: string;
  account_type: string;
  balance: number;
  bsb: string | null;
  account_number: string | null;
  bank_name: string | null;
}

interface TrustTx {
  id: string;
  trust_account_id: string;
  transaction_type: string;
  category: string;
  amount: number;
  description: string | null;
  payee_name: string | null;
  status: string;
  transaction_date: string;
}

const PartnerTrustPage = () => {
  const { activeAgency } = usePartner();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [transactions, setTransactions] = useState<TrustTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeAgency?.agentId) return;
    setLoading(true);

    const { data: accts } = await supabase
      .from('trust_accounts')
      .select('id, account_name, account_type, balance, bsb, account_number, bank_name')
      .eq('agent_id', activeAgency.agentId)
      .order('created_at', { ascending: false });

    if (accts) {
      setAccounts(accts as unknown as TrustAccount[]);
      const accountIds = accts.map((a: any) => a.id);
      if (accountIds.length > 0) {
        // Fetch from both trust_receipts and trust_payments
        const { data: receipts } = await supabase
          .from('trust_receipts')
          .select('id, agent_id, purpose, amount, description, client_name, status, date_received')
          .eq('agent_id', activeAgency.agentId)
          .neq('status', 'voided')
          .order('date_received', { ascending: false })
          .limit(10);
        const { data: payments } = await supabase
          .from('trust_payments')
          .select('id, agent_id, purpose, amount, description, client_name, payee_name, status, date_paid')
          .eq('agent_id', activeAgency.agentId)
          .neq('status', 'voided')
          .order('date_paid', { ascending: false })
          .limit(10);
        const mapped: TrustTx[] = [
          ...(receipts || []).map((r: any) => ({
            id: r.id,
            trust_account_id: '',
            transaction_type: 'deposit' as const,
            category: r.purpose || 'deposit',
            amount: Number(r.amount),
            description: r.description,
            payee_name: r.client_name,
            status: r.status,
            transaction_date: r.date_received,
          })),
          ...(payments || []).map((p: any) => ({
            id: p.id,
            trust_account_id: '',
            transaction_type: 'withdrawal' as const,
            category: p.purpose || 'disbursement',
            amount: Number(p.amount),
            description: p.description,
            payee_name: p.payee_name || p.client_name,
            status: p.status,
            transaction_date: p.date_paid,
          })),
        ];
        mapped.sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
        setTransactions(mapped.slice(0, 20));
      } else {
        setTransactions([]);
      }
    }
    setLoading(false);
  }, [activeAgency?.agentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!activeAgency) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Landmark size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a client agency from the sidebar to view their trust accounting.</p>
      </div>
    );
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const receiptsThisMonth = transactions.filter(t => t.transaction_type === 'deposit' && t.transaction_date >= monthStart).reduce((s, t) => s + t.amount, 0);
  const paymentsThisMonth = transactions.filter(t => t.transaction_type === 'withdrawal' && t.transaction_date >= monthStart).reduce((s, t) => s + t.amount, 0);
  const unreconciledCount = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="flex-1">
      <div className="px-6 pt-4 pb-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 size={12} />
          Viewing: <span className="font-medium text-foreground">{activeAgency.name}</span>
        </p>
      </div>

      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground">Trust Accounting</h1>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><DollarSign size={18} className="text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trust Balance</p>
                    <p className="text-lg font-semibold text-foreground">{AUD.format(totalBalance)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10"><ArrowDownCircle size={18} className="text-emerald-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receipts (MTD)</p>
                    <p className="text-lg font-semibold text-foreground">{AUD.format(receiptsThisMonth)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10"><ArrowUpCircle size={18} className="text-amber-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payments (MTD)</p>
                    <p className="text-lg font-semibold text-foreground">{AUD.format(paymentsThisMonth)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle size={18} className="text-red-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unreconciled</p>
                    <p className="text-lg font-semibold text-foreground">{unreconciledCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowReceipt(true)} className="gap-1.5">
                <Receipt size={14} /> New Receipt
              </Button>
            </div>

            {/* Accounts */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Trust Accounts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map(a => (
                    <Card key={a.id}>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-foreground">{a.account_name}</p>
                        <p className="text-xs text-muted-foreground">{a.bank_name || 'No bank'} · {a.bsb || '—'} / {a.account_number || '—'}</p>
                        <p className="text-lg font-bold text-foreground mt-1">{AUD.format(a.balance)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Recent Transactions</h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                            No transactions found for this agency.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map(tx => {
                          const st = STATUS_MAP[tx.status] || { variant: 'outline' as const, label: tx.status };
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm">{DATE_FMT.format(new Date(tx.transaction_date))}</TableCell>
                              <TableCell className="text-sm">{tx.description || tx.payee_name || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">{tx.category}</Badge>
                              </TableCell>
                              <TableCell className={`text-right tabular-nums font-medium ${tx.transaction_type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {tx.transaction_type === 'deposit' ? '+' : '-'}{AUD.format(tx.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <TrustReceiptModal open={showReceipt} onOpenChange={setShowReceipt} onCreated={fetchData} agentId={activeAgency?.agentId} />
    </div>
  );
};

export default PartnerTrustPage;
