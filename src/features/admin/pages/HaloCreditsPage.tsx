import { useEffect, useMemo, useState } from 'react';
import { Loader2, Coins, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { HaloCreditTransaction } from '@/types/halo';

interface AgentRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  balance: number;
}

export default function HaloCreditsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AgentRow | null>(null);
  const [grantAmount, setGrantAmount] = useState('10');
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);
  const [history, setHistory] = useState<HaloCreditTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Fetch all agents (via agents table → user_id), join with credits + profile
      const [agentsRes, profilesRes, creditsRes] = await Promise.all([
        supabase.from('agents').select('user_id'),
        supabase.from('profiles').select('user_id, display_name'),
        supabase.from('halo_credits').select('agent_id, balance'),
      ]);

      const profileMap = new Map<string, string | null>();
      (profilesRes.data ?? []).forEach((p: any) => profileMap.set(p.user_id, p.display_name));

      const creditMap = new Map<string, number>();
      (creditsRes.data ?? []).forEach((c: any) => creditMap.set(c.agent_id, c.balance));

      // Get emails via admin function
      let emailMap = new Map<string, string | null>();
      try {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        const res = await callAdminFunction('list_users');
        (res?.users ?? []).forEach((u: any) => emailMap.set(u.id, u.email ?? null));
      } catch (e) {
        console.warn('[HaloCredits] could not fetch user emails', e);
      }

      const rows: AgentRow[] = (agentsRes.data ?? []).map((a: any) => ({
        user_id: a.user_id,
        display_name: profileMap.get(a.user_id) ?? null,
        email: emailMap.get(a.user_id) ?? null,
        balance: creditMap.get(a.user_id) ?? 0,
      }));
      rows.sort((x, y) => (y.balance - x.balance) || (x.display_name ?? '').localeCompare(y.display_name ?? ''));
      setAgents(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        (a.display_name ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q),
    );
  }, [agents, search]);

  const loadHistory = async (agentId: string) => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('halo_credit_transactions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory((data ?? []) as HaloCreditTransaction[]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelect = (a: AgentRow) => {
    setSelected(a);
    setGrantAmount('10');
    setGrantNote('');
    loadHistory(a.user_id);
  };

  const handleGrant = async () => {
    if (!selected || !user) return;
    const amount = parseInt(grantAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive whole number.');
      return;
    }
    setGranting(true);
    try {
      // Upsert credits
      const { data: existing } = await supabase
        .from('halo_credits')
        .select('balance')
        .eq('agent_id', selected.user_id)
        .maybeSingle();

      const newBalance = (existing?.balance ?? 0) + amount;
      if (existing) {
        const { error } = await supabase
          .from('halo_credits')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('agent_id', selected.user_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('halo_credits')
          .insert({ agent_id: selected.user_id, balance: newBalance });
        if (error) throw error;
      }

      const { error: txErr } = await supabase.from('halo_credit_transactions').insert({
        agent_id: selected.user_id,
        amount,
        type: 'grant',
        note: grantNote || `Granted by admin`,
      });
      if (txErr) throw txErr;

      toast.success(`Granted ${amount} credits.`);
      setSelected({ ...selected, balance: newBalance });
      setAgents((prev) =>
        prev.map((a) => (a.user_id === selected.user_id ? { ...a, balance: newBalance } : a)),
      );
      setGrantNote('');
      loadHistory(selected.user_id);
    } catch (e) {
      console.error('[HaloCredits] grant failed', e);
      toast.error('Failed to grant credits.');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins size={22} /> Halo Credits
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage agent credit balances for the Halo Board.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow
                        key={a.user_id}
                        className={`cursor-pointer ${selected?.user_id === a.user_id ? 'bg-muted' : ''}`}
                        onClick={() => handleSelect(a)}
                      >
                        <TableCell>
                          <div className="font-medium">{a.display_name ?? 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{a.email ?? '—'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {a.balance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No agents found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Select an agent to manage credits.
              </p>
            ) : (
              <>
                <div>
                  <h2 className="font-semibold">{selected.display_name ?? 'Unknown'}</h2>
                  <p className="text-xs text-muted-foreground">{selected.email ?? '—'}</p>
                  <p className="mt-2 text-sm">
                    Current balance:{' '}
                    <span className="font-bold">{selected.balance} credits</span>
                  </p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <label className="text-sm font-medium">Grant credits</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      className="w-24"
                    />
                    <Input
                      placeholder="Note (optional)"
                      value={grantNote}
                      onChange={(e) => setGrantNote(e.target.value)}
                    />
                    <Button onClick={handleGrant} disabled={granting}>
                      {granting ? <Loader2 className="animate-spin" size={16} /> : 'Grant'}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-2">Recent transactions</h3>
                  {historyLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="text-xs">
                                {new Date(t.created_at).toLocaleDateString('en-AU')}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {t.type}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}
                              >
                                {t.amount > 0 ? '+' : ''}
                                {t.amount}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {t.note ?? '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
