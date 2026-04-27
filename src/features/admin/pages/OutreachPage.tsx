import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { callAdminFunction } from '@/features/admin/lib/adminApi';
import { buildAuditMeta } from '@/shared/lib/auditLog';

type Audience = 'agents' | 'buyers';
type AgentStatus = 'all' | 'active' | 'trial';
type TrialEnding = 'any' | '7' | '14' | '30';
type LastActive = 'any' | '7' | '14' | '30';
type HasListings = 'any' | 'yes' | 'no';
type YesNoAny = 'any' | 'yes' | 'no';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const PLAN_OPTIONS = [
  { value: 'demo', label: 'Trial' },
  { value: 'solo', label: 'Solo' },
  { value: 'agency', label: 'Agency' },
  { value: 'agency_pro', label: 'Agency Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];
const PLAN_LABEL: Record<string, string> = {
  demo: 'Trial', solo: 'Solo', agency: 'Agency', agency_pro: 'Agency Pro', enterprise: 'Enterprise',
};

interface AgentRow {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  plan: string;
  isSubscribed: boolean;
  state: string | null;
  createdAt: string;
  lastSignIn: string | null;
  activeListings: number;
  subStart: string | null;
}

interface BuyerRow {
  id: string;
  userId: string;
  email: string;
  budgetMin: number | null;
  budgetMax: number | null;
  savedCount: number;
  createdAt: string;
  hasBrief: boolean;
}

function downloadCsv(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function logAudit(actionType: string, metadata: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from('audit_log') as any).insert({
      action_type: actionType,
      entity_type: 'segment',
      user_id: user?.id ?? null,
      metadata: buildAuditMeta(metadata) as any,
    });
  } catch {}
}

function PillTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {children}
    </button>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] uppercase tracking-wide text-stone-500">{label}</Label>
      {children}
    </div>
  );
}

export default function OutreachPage() {
  const [audience, setAudience] = useState<Audience>('agents');
  const [loading, setLoading] = useState(false);

  // Agent filters
  const [planFilter, setPlanFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<AgentStatus>('all');
  const [trialEnding, setTrialEnding] = useState<TrialEnding>('any');
  const [lastActive, setLastActive] = useState<LastActive>('any');
  const [hasListings, setHasListings] = useState<HasListings>('any');
  const [stateFilter, setStateFilter] = useState<string[]>([]);

  // Buyer filters
  const [hasSaved, setHasSaved] = useState<YesNoAny>('any');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [newThisWeek, setNewThisWeek] = useState(false);
  const [hasBrief, setHasBrief] = useState<YesNoAny>('any');

  // Results
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePlan = (val: string) =>
    setPlanFilter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  const toggleState = (val: string) =>
    setStateFilter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: agentsData } = await (supabase as any)
        .from('agents')
        .select('id, name, email, agency, is_subscribed, created_at, state, agent_subscriptions(plan_type, subscription_start)')
        .limit(500);

      // active listings count
      const { data: listingsData } = await supabase
        .from('properties')
        .select('agent_id')
        .eq('is_active', true);
      const listingCount = new Map<string, number>();
      (listingsData || []).forEach((l: any) => {
        listingCount.set(l.agent_id, (listingCount.get(l.agent_id) || 0) + 1);
      });

      // last sign in (only if filter active)
      const signInMap = new Map<string, string | null>();
      if (lastActive !== 'any') {
        try {
          const j = await callAdminFunction('list_users');
          (j?.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
        } catch {}
      }

      const rows: AgentRow[] = (agentsData || []).map((a: any) => {
        const sub = Array.isArray(a.agent_subscriptions) ? a.agent_subscriptions[0] : a.agent_subscriptions;
        const plan = (sub?.plan_type || 'demo').toLowerCase();
        return {
          id: a.id,
          name: a.name || '',
          email: a.email || '',
          agency: a.agency,
          plan,
          isSubscribed: !!a.is_subscribed,
          state: a.state,
          createdAt: a.created_at,
          lastSignIn: signInMap.get(a.id) || null,
          activeListings: listingCount.get(a.id) || 0,
          subStart: sub?.subscription_start || null,
        };
      });

      // Apply filters
      const now = Date.now();
      const filtered = rows.filter(r => {
        if (planFilter.length > 0 && !planFilter.includes(r.plan)) return false;
        if (statusFilter === 'active' && !r.isSubscribed) return false;
        if (statusFilter === 'trial' && r.isSubscribed) return false;
        if (statusFilter === 'trial' && trialEnding !== 'any') {
          // trial ends 60 days after created_at
          const trialEnd = new Date(r.createdAt).getTime() + 60 * 86400000;
          const daysLeft = (trialEnd - now) / 86400000;
          const window = parseInt(trialEnding, 10);
          if (daysLeft < 0 || daysLeft > window) return false;
        }
        if (lastActive !== 'any') {
          const window = parseInt(lastActive, 10);
          const cutoff = now - window * 86400000;
          if (r.lastSignIn && new Date(r.lastSignIn).getTime() > cutoff) return false;
        }
        if (hasListings === 'yes' && r.activeListings < 1) return false;
        if (hasListings === 'no' && r.activeListings > 0) return false;
        if (stateFilter.length > 0 && (!r.state || !stateFilter.includes(r.state))) return false;
        return true;
      });

      setAgents(filtered);
    } catch (err) {
      console.error('Agent segment fetch failed', err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [planFilter, statusFilter, trialEnding, lastActive, hasListings, stateFilter]);

  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profileData } = await (supabase as any)
        .from('buyer_profiles')
        .select('id, user_id, budget_min, budget_max, created_at')
        .limit(500);

      const userIds = (profileData || []).map((p: any) => p.user_id).filter(Boolean);

      // saved counts
      const savedMap = new Map<string, number>();
      if (userIds.length > 0) {
        const { data: savedData } = await (supabase as any)
          .from('saved_properties')
          .select('user_id');
        (savedData || []).forEach((s: any) => {
          if (s.user_id) savedMap.set(s.user_id, (savedMap.get(s.user_id) || 0) + 1);
        });
      }

      // emails
      const emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        (profilesData || []).forEach((p: any) => {
          if (p.email) emailMap.set(p.id, p.email);
        });
      }

      // briefs
      const briefSet = new Set<string>();
      try {
        const { data: briefsData } = await (supabase as any)
          .from('buyer_briefs')
          .select('buyer_id, user_id');
        (briefsData || []).forEach((b: any) => {
          const id = b.user_id || b.buyer_id;
          if (id) briefSet.add(id);
        });
      } catch {}

      const rows: BuyerRow[] = (profileData || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        email: emailMap.get(p.user_id) || '',
        budgetMin: p.budget_min,
        budgetMax: p.budget_max,
        savedCount: savedMap.get(p.user_id) || 0,
        createdAt: p.created_at,
        hasBrief: briefSet.has(p.user_id),
      }));

      const now = Date.now();
      const minVal = budgetMin ? parseFloat(budgetMin) : null;
      const maxVal = budgetMax ? parseFloat(budgetMax) : null;

      const filtered = rows.filter(r => {
        if (hasSaved === 'yes' && r.savedCount < 1) return false;
        if (hasSaved === 'no' && r.savedCount > 0) return false;
        if (minVal !== null && (r.budgetMax || 0) < minVal) return false;
        if (maxVal !== null && (r.budgetMin || 0) > maxVal) return false;
        if (newThisWeek) {
          const age = (now - new Date(r.createdAt).getTime()) / 86400000;
          if (age > 7) return false;
        }
        if (hasBrief === 'yes' && !r.hasBrief) return false;
        if (hasBrief === 'no' && r.hasBrief) return false;
        return true;
      });

      setBuyers(filtered);
    } catch (err) {
      console.error('Buyer segment fetch failed', err);
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  }, [hasSaved, budgetMin, budgetMax, newThisWeek, hasBrief]);

  // Debounced re-query on any filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (audience === 'agents') fetchAgents();
      else fetchBuyers();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [audience, fetchAgents, fetchBuyers]);

  const currentEmails = useMemo(() => {
    const list = audience === 'agents'
      ? agents.map(a => a.email)
      : buyers.map(b => b.email);
    return list.filter(Boolean);
  }, [audience, agents, buyers]);

  const count = audience === 'agents' ? agents.length : buyers.length;

  const handleCopy = async () => {
    if (currentEmails.length === 0) {
      toast.error('No emails to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentEmails.join(', '));
      toast.success(`Copied ${currentEmails.length} email addresses`);
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const handleExport = async () => {
    if (count === 0) {
      toast.error('Segment is empty');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    if (audience === 'agents') {
      const rows = [
        ['Name', 'Agency', 'Plan', 'Email', 'State', 'Joined'],
        ...agents.map(a => [
          a.name, a.agency || '', PLAN_LABEL[a.plan] || a.plan, a.email,
          a.state || '', new Date(a.createdAt).toLocaleDateString(),
        ]),
      ];
      downloadCsv(rows, `listhq-segment-agents-${date}.csv`);
    } else {
      const rows = [
        ['Email', 'Budget Min', 'Budget Max', 'Saved Properties', 'Joined'],
        ...buyers.map(b => [
          b.email,
          b.budgetMin?.toString() || '',
          b.budgetMax?.toString() || '',
          b.savedCount.toString(),
          new Date(b.createdAt).toLocaleDateString(),
        ]),
      ];
      downloadCsv(rows, `listhq-segment-buyers-${date}.csv`);
    }
    await logAudit('segment_exported', { audience, count });
    toast.success(`Exported ${count} ${audience}`);
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build agent and buyer segments then export for your email tool.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* LEFT — Segment Builder */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-3">Build segment</h2>
            <div className="flex gap-2">
              <PillTab active={audience === 'agents'} onClick={() => setAudience('agents')}>Agents</PillTab>
              <PillTab active={audience === 'buyers'} onClick={() => setAudience('buyers')}>Buyers</PillTab>
            </div>
          </div>

          {audience === 'agents' ? (
            <>
              <FieldGroup label="Plan">
                <div className="space-y-1.5">
                  {PLAN_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={planFilter.includes(opt.value)}
                        onCheckedChange={() => togglePlan(opt.value)}
                      />
                      <span className="text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="Status">
                <div className="space-y-1.5 text-sm">
                  {([['all', 'All'], ['active', 'Active'], ['trial', 'Trial only']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === v}
                        onChange={() => setStatusFilter(v)}
                      />
                      <span className="text-foreground">{l}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>

              {statusFilter === 'trial' && (
                <FieldGroup label="Trial ending">
                  <div className="space-y-1.5 text-sm">
                    {([['any', 'Any'], ['7', 'Within 7 days'], ['14', 'Within 14 days'], ['30', 'Within 30 days']] as const).map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="trialEnding"
                          checked={trialEnding === v}
                          onChange={() => setTrialEnding(v)}
                        />
                        <span className="text-foreground">{l}</span>
                      </label>
                    ))}
                  </div>
                </FieldGroup>
              )}

              <FieldGroup label="Last active">
                <select
                  value={lastActive}
                  onChange={(e) => setLastActive(e.target.value as LastActive)}
                  className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 text-foreground outline-none"
                >
                  <option value="any">Any</option>
                  <option value="7">Not seen in 7 days</option>
                  <option value="14">Not seen in 14 days</option>
                  <option value="30">Not seen in 30 days</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Has listings">
                <div className="space-y-1.5 text-sm">
                  {([['any', 'Any'], ['yes', 'Yes (≥1 active)'], ['no', 'No (zero active)']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasListings"
                        checked={hasListings === v}
                        onChange={() => setHasListings(v)}
                      />
                      <span className="text-foreground">{l}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="State">
                <div className="grid grid-cols-2 gap-1.5">
                  {STATES.map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={stateFilter.includes(s)}
                        onCheckedChange={() => toggleState(s)}
                      />
                      <span className="text-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
            </>
          ) : (
            <>
              <FieldGroup label="Has saved properties">
                <div className="space-y-1.5 text-sm">
                  {([['any', 'Any'], ['yes', 'Yes'], ['no', 'No']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasSaved"
                        checked={hasSaved === v}
                        onChange={() => setHasSaved(v)}
                      />
                      <span className="text-foreground">{l}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="Budget range (AUD)">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="New this week">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={newThisWeek}
                    onCheckedChange={(v) => setNewThisWeek(!!v)}
                  />
                  <span className="text-foreground">Signed up in the last 7 days</span>
                </label>
              </FieldGroup>

              <FieldGroup label="Has buyer brief">
                <div className="space-y-1.5 text-sm">
                  {([['any', 'Any'], ['yes', 'Yes'], ['no', 'No']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasBrief"
                        checked={hasBrief === v}
                        onChange={() => setHasBrief(v)}
                      />
                      <span className="text-foreground">{l}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
            </>
          )}
        </div>

        {/* RIGHT — Audience Preview */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-foreground">Audience</h2>
            <span className="bg-blue-100 text-blue-700 text-[12px] font-medium rounded-full px-2.5 py-0.5">
              {count} {audience}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : count === 0 ? (
            <div className="text-center py-16 text-stone-400 text-sm">
              No results match your filters
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-xl border border-stone-200">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-600 text-[12px] uppercase tracking-wide sticky top-0">
                  <tr>
                    {audience === 'agents' ? (
                      <>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Agency</th>
                        <th className="text-left px-3 py-2 font-medium">Plan</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-left px-3 py-2 font-medium">State</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-left px-3 py-2 font-medium">Budget</th>
                        <th className="text-left px-3 py-2 font-medium">Saved</th>
                        <th className="text-left px-3 py-2 font-medium">Joined</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {audience === 'agents'
                    ? agents.map(a => (
                        <tr key={a.id} className="border-t border-stone-100">
                          <td className="px-3 py-2 text-stone-900 font-medium">{a.name}</td>
                          <td className="px-3 py-2 text-stone-700">{a.agency || '—'}</td>
                          <td className="px-3 py-2 text-stone-700">{PLAN_LABEL[a.plan] || a.plan}</td>
                          <td className="px-3 py-2 text-stone-700">{a.email}</td>
                          <td className="px-3 py-2 text-stone-700">{a.state || '—'}</td>
                        </tr>
                      ))
                    : buyers.map(b => (
                        <tr key={b.id} className="border-t border-stone-100">
                          <td className="px-3 py-2 text-stone-900">{b.email || '—'}</td>
                          <td className="px-3 py-2 text-stone-700">
                            {b.budgetMin || b.budgetMax
                              ? `${b.budgetMin ? `$${b.budgetMin.toLocaleString()}` : '—'} – ${b.budgetMax ? `$${b.budgetMax.toLocaleString()}` : '—'}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-stone-700">{b.savedCount}</td>
                          <td className="px-3 py-2 text-stone-500 text-[12px]">{new Date(b.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={handleCopy} disabled={count === 0}>
              Copy email addresses
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExport} disabled={count === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
