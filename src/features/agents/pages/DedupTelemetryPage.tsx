import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { buildAuditMeta } from '@/shared/lib/auditLog';

interface DedupEvent {
  id: string;
  agency_id: string | null;
  agent_user_id: string;
  action: string;
  match_method: string | null;
  similarity_score: number | null;
  created_at: string;
}

interface AgencyOption { id: string; name: string }

const ACTIONS = ['suggested','accepted','ignored','created_anyway','blocked_at_save','soft_warned'] as const;

export default function DedupTelemetryPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [authorised, setAuthorised] = useState<boolean | null>(null);

  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [events, setEvents] = useState<DedupEvent[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState<number>(0.80);
  const [draftThreshold, setDraftThreshold] = useState<string>('0.80');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bootstrap: figure out which agencies the user can view
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setAuthorised(false); return; }
      let opts: AgencyOption[] = [];
      if (isAdmin) {
        const { data } = await supabase.from('agencies').select('id, name').order('name');
        opts = (data ?? []) as AgencyOption[];
      } else {
        const { data: members } = await supabase
          .from('agency_members')
          .select('agency_id, role, agencies:agency_id (id, name)')
          .eq('user_id', user.id)
          .in('role', ['owner','principal','admin']);
        opts = (members ?? [])
          .map((m: any) => m.agencies)
          .filter(Boolean) as AgencyOption[];
      }
      if (cancelled) return;
      if (opts.length === 0) { setAuthorised(false); return; }
      setAuthorised(true);
      setAgencies(opts);
      setAgencyId(opts[0].id);
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  // Load events + threshold for selected agency
  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: evts }, { data: cfg }] = await Promise.all([
        supabase.from('contact_duplicate_events')
          .select('id, agency_id, agent_user_id, action, match_method, similarity_score, created_at')
          .eq('agency_id', agencyId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase.from('dedup_config').select('fuzzy_threshold').eq('agency_id', agencyId).maybeSingle(),
      ]);
      if (cancelled) return;
      const rows = (evts ?? []) as DedupEvent[];
      setEvents(rows);
      const t = cfg?.fuzzy_threshold != null ? Number(cfg.fuzzy_threshold) : 0.80;
      setThreshold(t);
      setDraftThreshold(t.toFixed(2));

      const userIds = [...new Set(rows.map(r => r.agent_user_id))];
      if (userIds.length) {
        const { data: ags } = await supabase
          .from('agents').select('user_id, name').in('user_id', userIds);
        const map: Record<string, string> = {};
        (ags ?? []).forEach((a: any) => { map[a.user_id] = a.name; });
        if (!cancelled) setAgentNames(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agencyId]);

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const total = events.length;
    const exact = events.filter(e => e.match_method === 'email' || e.match_method === 'phone');
    const fuzzy = events.filter(e => e.match_method === 'name_fuzzy');
    const accepted = events.filter(e => e.action === 'accepted');
    const created = events.filter(e => e.action === 'created_anyway');
    const acceptRate = total ? (accepted.length / total) * 100 : 0;
    const acceptRateExact = exact.length ? (exact.filter(e => e.action === 'accepted').length / exact.length) * 100 : 0;
    const acceptRateFuzzy = fuzzy.length ? (fuzzy.filter(e => e.action === 'accepted').length / fuzzy.length) * 100 : 0;
    const createAnywayRate = total ? (created.length / total) * 100 : 0;

    // Cross-agent matches: events where the suggested contact is owned by another agent
    // We don't track that directly here; approximate with agent count diversity.
    const agentSet = new Set(events.map(e => e.agent_user_id));
    return {
      total, exactCount: exact.length, fuzzyCount: fuzzy.length,
      acceptRate, acceptRateExact, acceptRateFuzzy, createAnywayRate,
      uniqueAgents: agentSet.size,
    };
  }, [events]);

  // Histogram of fuzzy similarity scores, stacked by action
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      min: 0.5 + i * 0.05, max: 0.5 + (i + 1) * 0.05,
      accepted: 0, ignored: 0, created_anyway: 0, other: 0, total: 0,
    }));
    for (const e of events) {
      if (e.match_method !== 'name_fuzzy' || e.similarity_score == null) continue;
      const s = Number(e.similarity_score);
      const idx = Math.min(9, Math.max(0, Math.floor((s - 0.5) / 0.05)));
      const b = buckets[idx];
      b.total++;
      if (e.action === 'accepted') b.accepted++;
      else if (e.action === 'ignored') b.ignored++;
      else if (e.action === 'created_anyway') b.created_anyway++;
      else b.other++;
    }
    return buckets;
  }, [events]);

  // Suggested threshold: lowest bucket where accept rate >= 50%
  const suggestedThreshold = useMemo(() => {
    const candidate = histogram.find(b => b.total >= 3 && (b.accepted / b.total) >= 0.5);
    return candidate ? Number(candidate.min.toFixed(2)) : null;
  }, [histogram]);

  // Worst offenders: highest create_anyway rate on EXACT matches (≥3 prompts, >20%)
  const offenders = useMemo(() => {
    const byAgent = new Map<string, { exact: number; created: number }>();
    for (const e of events) {
      if (e.match_method !== 'email' && e.match_method !== 'phone') continue;
      const cur = byAgent.get(e.agent_user_id) ?? { exact: 0, created: 0 };
      cur.exact++;
      if (e.action === 'created_anyway') cur.created++;
      byAgent.set(e.agent_user_id, cur);
    }
    return [...byAgent.entries()]
      .filter(([, v]) => v.exact >= 3 && v.created / v.exact > 0.20)
      .map(([uid, v]) => ({ uid, exact: v.exact, created: v.created, rate: (v.created / v.exact) * 100 }))
      .sort((a, b) => b.rate - a.rate);
  }, [events]);

  const handleSaveThreshold = async () => {
    if (!agencyId || !user) return;
    const next = Number(draftThreshold);
    if (Number.isNaN(next) || next < 0 || next > 1) {
      toast.error('Threshold must be between 0 and 1');
      return;
    }
    const previous = threshold;
    const { error } = await supabase.from('dedup_config').upsert(
      { agency_id: agencyId, fuzzy_threshold: next, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'agency_id' },
    );
    if (error) { toast.error(`Failed to save: ${error.message}`); return; }

    await supabase.from('audit_log').insert({
      user_id: user.id,
      agency_id: agencyId,
      action_type: 'dedup_threshold_changed',
      entity_type: 'dedup_config',
      entity_id: agencyId,
      description: `Fuzzy match threshold changed from ${previous.toFixed(2)} to ${next.toFixed(2)}`,
      metadata: { previous, next },
    });

    setThreshold(next);
    setConfirmOpen(false);
    toast.success('Threshold updated');
  };

  if (authorised === false) {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto mb-3 text-muted-foreground" size={32} />
        <p className="font-semibold">Access restricted</p>
        <p className="text-sm text-muted-foreground">This page is for agency principals and platform admins.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }
  if (authorised === null || loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const hMax = Math.max(1, ...histogram.map(b => b.total));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Helmet>
        <title>Dedup Telemetry · ListHQ Admin</title>
      </Helmet>

      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Duplicate Detection Telemetry</h1>
          <p className="text-sm text-muted-foreground">Last 30 days · Tune fuzzy match threshold based on real agent behaviour.</p>
        </div>
        {isAdmin && agencies.length > 1 && (
          <select
            value={agencyId ?? ''}
            onChange={e => setAgencyId(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-background"
          >
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Prompts shown" value={String(stats.total)} sub={`${stats.exactCount} exact · ${stats.fuzzyCount} fuzzy`} />
        <StatTile label="Accept rate" value={`${stats.acceptRate.toFixed(0)}%`}
          sub={`Exact ${stats.acceptRateExact.toFixed(0)}% · Fuzzy ${stats.acceptRateFuzzy.toFixed(0)}%`} />
        <StatTile label="Create-anyway rate" value={`${stats.createAnywayRate.toFixed(0)}%`}
          sub={stats.createAnywayRate > 20 ? 'High — review training' : 'Within expected range'}
          tone={stats.createAnywayRate > 20 ? 'destructive' : 'default'} />
        <StatTile label="Agents prompted" value={String(stats.uniqueAgents)} sub="Distinct agents in window" />
      </div>

      {/* Histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} /> Fuzzy similarity distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.fuzzyCount === 0 ? (
            <p className="text-sm text-muted-foreground italic">No fuzzy match events yet. Histogram appears once agents see suggestions.</p>
          ) : (
            <>
              <div className="flex items-end gap-1 h-40 border-b border-border">
                {histogram.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col-reverse" title={`${b.min.toFixed(2)}–${b.max.toFixed(2)}: ${b.total} events`}>
                    {b.accepted > 0 && <div className="bg-success" style={{ height: `${(b.accepted / hMax) * 100}%` }} />}
                    {b.ignored > 0 && <div className="bg-muted-foreground/40" style={{ height: `${(b.ignored / hMax) * 100}%` }} />}
                    {b.created_anyway > 0 && <div className="bg-destructive" style={{ height: `${(b.created_anyway / hMax) * 100}%` }} />}
                    {b.other > 0 && <div className="bg-secondary" style={{ height: `${(b.other / hMax) * 100}%` }} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                {histogram.map((b, i) => <span key={i}>{b.min.toFixed(2)}</span>)}
                <span>1.00</span>
              </div>
              <div className="flex gap-3 text-xs mt-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-success rounded" /> Accepted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-muted-foreground/40 rounded" /> Ignored</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-destructive rounded" /> Created anyway</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Threshold tuner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fuzzy match threshold</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-display text-2xl font-bold">{threshold.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Suggested</p>
              <p className="font-display text-2xl font-bold text-primary">
                {suggestedThreshold != null ? suggestedThreshold.toFixed(2) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">First bucket where ≥50% accepted (min 3 events)</p>
            </div>
            <div className="ml-auto flex items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Update to</label>
                <Input
                  type="number" step="0.01" min="0" max="1"
                  value={draftThreshold} onChange={e => setDraftThreshold(e.target.value)}
                  className="w-24"
                />
              </div>
              <Button onClick={() => setConfirmOpen(true)} disabled={Number(draftThreshold) === threshold}>
                Save
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Threshold is the minimum trigram similarity (0–1) for a fuzzy name match to be surfaced. Lower = more suggestions, higher false positives. Higher = fewer suggestions, may miss real duplicates.
          </p>
        </CardContent>
      </Card>

      {/* Worst offenders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-destructive" /> Agents bypassing exact matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offenders.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No agents over the 20% threshold. 👍</p>
          ) : (
            <div className="space-y-2">
              {offenders.map(o => (
                <div key={o.uid} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div>
                    <p className="font-medium text-sm">{agentNames[o.uid] ?? 'Unknown agent'}</p>
                    <p className="text-xs text-muted-foreground">{o.created} of {o.exact} exact-match prompts bypassed</p>
                  </div>
                  <Badge variant="destructive">{o.rate.toFixed(0)}%</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm threshold change</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <p>Change fuzzy match threshold from <strong>{threshold.toFixed(2)}</strong> to <strong>{Number(draftThreshold).toFixed(2)}</strong>?</p>
            <p className="text-muted-foreground text-xs">
              {Number(draftThreshold) < threshold
                ? 'Lower value will surface more suggestions to agents (more false positives).'
                : 'Higher value will suppress weaker matches (may miss real duplicates).'}
            </p>
            <p className="text-xs text-muted-foreground">This change will be logged in the audit trail.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveThreshold}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'destructive' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-extrabold ${tone === 'destructive' ? 'text-destructive' : ''}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
