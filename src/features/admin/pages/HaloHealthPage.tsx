import { useEffect, useMemo, useState } from 'react';
import { Loader2, Activity, Send, Brain, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import HaloQualityBadge from '@/components/halo/HaloQualityBadge';

interface Diagnostics {
  halos: { total: number; embedded: number; stale: number };
  properties: { total: number; embedded: number; stale: number };
  jobs: Array<{
    jobname: string;
    schedule: string;
    active: boolean;
    last_status: string | null;
    last_start: string | null;
    last_end: string | null;
    last_error: string | null;
  }>;
}

interface HaloRow {
  id: string;
  seeker_id: string;
  intent: string;
  suburbs: string[];
  budget_min: number | null;
  budget_max: number;
  created_at: string;
  expires_at: string;
  quality_score: number | null;
  status: string;
  seeker_email?: string | null;
}

interface TxRow {
  id: string;
  agent_id: string;
  amount: number;
  type: string;
  halo_id: string | null;
  created_at: string;
  agent_email?: string | null;
}

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-AU'));

export default function HaloHealthPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTotal: 0, noResponse: 0, expiringWeek: 0, creditsSpent: 0,
  });
  const [needAttention, setNeedAttention] = useState<HaloRow[]>([]);
  const [activity, setActivity] = useState<TxRow[]>([]);
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map());
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [reembedding, setReembedding] = useState(false);

  const loadDiag = async () => {
    const { data, error } = await supabase.rpc('admin_halo_diagnostics');
    if (!error && data) setDiag(data as unknown as Diagnostics);
  };

  const triggerReembed = async () => {
    setReembedding(true);
    try {
      const { error } = await supabase.functions.invoke('embed-halos-and-properties', { body: { mode: 'backfill' } });
      if (error) throw error;
      toast.success('Embedding backfill triggered.');
      await loadDiag();
    } catch (e) {
      console.error(e);
      toast.error('Backfill failed.');
    } finally {
      setReembedding(false);
    }
  };

  useEffect(() => { loadDiag(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [activeAll, expiringRes, txMonthRes, txRecentRes, halosStaleRes, respRes] =
          await Promise.all([
            supabase.from('halos').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('halos').select('id', { count: 'exact', head: true })
              .eq('status', 'active').gte('expires_at', now.toISOString()).lte('expires_at', weekFromNow),
            supabase.from('halo_credit_transactions').select('amount').eq('type', 'spend')
              .gte('created_at', monthStart),
            supabase.from('halo_credit_transactions').select('*')
              .order('created_at', { ascending: false }).limit(50),
            supabase.from('halos').select('*').eq('status', 'active').lt('created_at', sevenDaysAgo),
            supabase.from('halo_responses').select('halo_id'),
          ]);

        const respondedIds = new Set((respRes.data ?? []).map((r: any) => r.halo_id));
        const stale = ((halosStaleRes.data ?? []) as any[]).filter((h) => !respondedIds.has(h.id));
        setNeedAttention(stale as HaloRow[]);

        const creditsSpent = (txMonthRes.data ?? []).reduce(
          (sum: number, r: any) => sum + Math.abs(r.amount), 0,
        );
        setStats({
          activeTotal: activeAll.count ?? 0,
          noResponse: stale.length,
          expiringWeek: expiringRes.count ?? 0,
          creditsSpent,
        });

        const txs = (txRecentRes.data ?? []) as TxRow[];
        setActivity(txs);

        // Resolve emails via admin function
        try {
          const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
          const res = await callAdminFunction('list_users');
          const map = new Map<string, string>();
          (res?.users ?? []).forEach((u: any) => { if (u.email) map.set(u.id, u.email); });
          setEmailMap(map);
        } catch (e) {
          console.warn('[HaloHealth] could not load emails', e);
        }
      } catch (e) {
        console.error('[HaloHealth]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendNudge = async (haloId: string) => {
    setNudgingId(haloId);
    try {
      // Reset alert flag so cron logic can re-process; for now just invoke the edge function
      await supabase.from('halos').update({ no_response_alert_sent: false }).eq('id', haloId);
      const { error } = await supabase.functions.invoke('halo-expiry-reminders', { body: {} });
      if (error) throw error;
      toast.success('Nudge sent.');
    } catch (e) {
      console.error(e);
      toast.error('Could not send nudge.');
    } finally {
      setNudgingId(null);
    }
  };

  const StatCard = ({ label, value }: { label: string; value: number | string }) => (
    <Card><CardContent className="p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity size={22} /> Halo Health
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor active Halos, agent activity, and credit usage.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Halos" value={stats.activeTotal} />
        <StatCard label="No responses (>7d)" value={stats.noResponse} />
        <StatCard label="Expiring this week" value={stats.expiringWeek} />
        <StatCard label="Credits spent (month)" value={stats.creditsSpent} />
      </div>

      {diag && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain size={18} /> Semantic embedding coverage
              </h2>
              <Button size="sm" variant="outline" onClick={triggerReembed} disabled={reembedding}>
                {reembedding ? <Loader2 size={14} className="animate-spin" /> : 'Re-embed stale'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Halos embedded</p>
                <p className="text-xl font-bold">{diag.halos.embedded}/{diag.halos.total}</p>
                {diag.halos.stale > 0 && <p className="text-[10px] text-amber-700 mt-1">{diag.halos.stale} stale (&gt;30d)</p>}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Properties embedded</p>
                <p className="text-xl font-bold">{diag.properties.embedded}/{diag.properties.total}</p>
                {diag.properties.stale > 0 && <p className="text-[10px] text-amber-700 mt-1">{diag.properties.stale} stale (&gt;30d)</p>}
              </div>
              <div className="rounded-lg border p-3 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase">Halo coverage</p>
                <div className="h-2 bg-slate-100 rounded mt-2 overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${diag.halos.total ? (diag.halos.embedded / diag.halos.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {diag.halos.total === 0 ? 'No active halos' : `${Math.round((diag.halos.embedded / diag.halos.total) * 100)}% coverage`}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mt-4 mb-2">
                <Clock size={16} /> Scheduled jobs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last status</TableHead>
                    <TableHead>Last run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diag.jobs.map((j) => {
                    const ok = j.last_status === 'succeeded';
                    return (
                      <TableRow key={j.jobname}>
                        <TableCell className="text-xs font-mono">{j.jobname}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{j.schedule}</TableCell>
                        <TableCell className="text-xs">
                          {j.last_status ? (
                            <Badge variant="outline" className={ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}>
                              {ok ? <CheckCircle2 size={11} className="mr-1" /> : <AlertTriangle size={11} className="mr-1" />}
                              {j.last_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">never run</span>
                          )}
                          {j.last_error && !ok && (
                            <div className="text-[10px] text-red-700 mt-1 max-w-md truncate" title={j.last_error}>{j.last_error}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {j.last_start ? new Date(j.last_start).toLocaleString('en-AU') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {diag.jobs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No scheduled jobs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}



      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold">Halos needing attention</h2>
          <p className="text-xs text-muted-foreground">Active Halos older than 7 days with zero agent responses.</p>
          {needAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All caught up.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seeker</TableHead>
                  <TableHead>Suburbs</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Days left</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needAttention.map((h) => {
                  const daysLeft = Math.max(0, Math.ceil(
                    (new Date(h.expires_at).getTime() - Date.now()) / 86400000,
                  ));
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{emailMap.get(h.seeker_id) ?? '—'}</TableCell>
                      <TableCell className="text-xs">{h.suburbs?.join(', ') || '—'}</TableCell>
                      <TableCell className="text-xs">${fmt(h.budget_min)}–${fmt(h.budget_max)}</TableCell>
                      <TableCell className="text-xs">{new Date(h.created_at).toLocaleDateString('en-AU')}</TableCell>
                      <TableCell><HaloQualityBadge score={h.quality_score} variant="seeker" /></TableCell>
                      <TableCell className="text-xs">{daysLeft}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => sendNudge(h.id)} disabled={nudgingId === h.id}>
                          {nudgingId === h.id ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Nudge</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold">Credit activity (last 50)</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Halo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString('en-AU')}</TableCell>
                  <TableCell className="text-xs">{emailMap.get(t.agent_id) ?? t.agent_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.type}</Badge></TableCell>
                  <TableCell className={`text-right font-medium text-xs ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.halo_id?.slice(0, 8) ?? '—'}</TableCell>
                </TableRow>
              ))}
              {activity.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No activity yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
