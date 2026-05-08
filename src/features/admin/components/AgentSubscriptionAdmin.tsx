import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, MoreVertical, ShieldCheck, ShieldX, Lock, RotateCcw, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'trial' | 'active' | 'payment_failed' | 'locked' | 'unapproved';

interface AdminAgentRow {
  id: string;
  name: string | null;
  email: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  is_subscribed: boolean | null;
  is_approved: boolean | null;
  created_at: string;
  payment_failed_at: string | null;
  admin_grace_until: string | null;
  listings_count: number;
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-slate-200 text-slate-700',
  solo: 'bg-slate-200 text-slate-700',
  pro: 'bg-blue-100 text-blue-700',
  agency_pro: 'bg-blue-100 text-blue-700',
  agency: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

function PlanBadge({ plan }: { plan: string | null }) {
  const key = (plan || '').toLowerCase();
  const cls = PLAN_BADGE[key] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {plan ? plan.replace('_', ' ') : 'Trial'}
    </span>
  );
}

function StatusBadge({ status, isSubscribed }: { status: string | null; isSubscribed: boolean | null }) {
  let label = status || (isSubscribed ? 'active' : 'trial');
  let cls = 'bg-blue-100 text-blue-700';
  if (label === 'active') cls = 'bg-emerald-100 text-emerald-700';
  else if (label === 'payment_failed') cls = 'bg-amber-100 text-amber-700';
  else if (label === 'locked') cls = 'bg-red-100 text-red-700';
  else if (label === 'trial') cls = 'bg-blue-100 text-blue-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {label.replace('_', ' ')}
    </span>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color?: 'green' | 'blue' | 'red' | 'default' }) {
  const tints: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-card text-foreground border-border',
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${tints[color || 'default']}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function trialEnd(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + 60 * 86400000);
}

export default function AgentSubscriptionAdmin() {
  const [agents, setAgents] = useState<AdminAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [graceOpenFor, setGraceOpenFor] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, propsRes] = await Promise.all([
        supabase
          .from('agents')
          .select(
            'id, name, email, subscription_status, is_subscribed, is_approved, created_at, payment_failed_at, admin_grace_until, agent_subscriptions(plan_type)'
          )
          .order('created_at', { ascending: false }),
        supabase.from('properties').select('agent_id'),
      ]);

      const propMap = new Map<string, number>();
      (propsRes.data || []).forEach((p: any) => {
        if (p.agent_id) propMap.set(p.agent_id, (propMap.get(p.agent_id) || 0) + 1);
      });

      const rows: AdminAgentRow[] = (agentsRes.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        plan_type: Array.isArray(a.agent_subscriptions)
          ? a.agent_subscriptions[0]?.plan_type ?? null
          : a.agent_subscriptions?.plan_type ?? null,
        subscription_status: a.subscription_status,
        is_subscribed: a.is_subscribed,
        is_approved: a.is_approved,
        created_at: a.created_at,
        payment_failed_at: a.payment_failed_at,
        admin_grace_until: a.admin_grace_until,
        listings_count: propMap.get(a.id) || 0,
      }));
      setAgents(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      const matchSearch =
        !q ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q);
      let matchStatus = true;
      if (statusFilter === 'trial') matchStatus = !a.is_subscribed;
      else if (statusFilter === 'active') matchStatus = a.subscription_status === 'active' && !!a.is_subscribed;
      else if (statusFilter === 'payment_failed') matchStatus = a.subscription_status === 'payment_failed';
      else if (statusFilter === 'locked') matchStatus = a.subscription_status === 'locked';
      else if (statusFilter === 'unapproved') matchStatus = !a.is_approved;
      return matchSearch && matchStatus;
    });
  }, [agents, search, statusFilter]);

  const totals = useMemo(
    () => ({
      total: agents.length,
      active: agents.filter((a) => a.subscription_status === 'active' && a.is_subscribed).length,
      trial: agents.filter((a) => !a.is_subscribed).length,
      issues: agents.filter(
        (a) => a.subscription_status === 'payment_failed' || a.subscription_status === 'locked'
      ).length,
    }),
    [agents]
  );

  const updateAgent = async (id: string, patch: Record<string, unknown>, successMsg: string) => {
    const { error } = await supabase.from('agents').update(patch).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(successMsg);
    fetchAgents();
  };

  const handleApprove = (id: string) => updateAgent(id, { is_approved: true }, 'Agent approved');
  const handleSuspend = (id: string) => {
    if (!confirm('Are you sure? This will lock the agent out of their account.')) return;
    updateAgent(id, { subscription_status: 'locked' }, 'Agent suspended');
  };
  const handleResetTrial = (id: string) =>
    updateAgent(
      id,
      { subscription_status: 'active', payment_failed_at: null },
      'Agent reset to active state'
    );
  const handleGrace = (id: string, date: Date | undefined) => {
    if (!date) return;
    updateAgent(id, { admin_grace_until: date.toISOString() }, 'Grace period granted');
    setGraceOpenFor(null);
  };

  return (
    <div className="space-y-4 mb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Subscription & Access</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Approve agents, manage trials, suspend access, and grant grace periods.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <StatChip label="Total agents" value={totals.total} />
        <StatChip label="Active" value={totals.active} color="green" />
        <StatChip label="On trial" value={totals.trial} color="blue" />
        <StatChip label="Payment issues" value={totals.issues} color="red" />
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-xs bg-card border border-border rounded-md px-3 py-2 text-foreground outline-none"
        >
          <option value="all">All agents</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="payment_failed">Payment failed</option>
          <option value="locked">Locked</option>
          <option value="unapproved">Unapproved</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Email</th>
                <th className="text-left font-medium px-3 py-2">Plan</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Trial expires</th>
                <th className="text-left font-medium px-3 py-2">Listings</th>
                <th className="text-left font-medium px-3 py-2">Approved</th>
                <th className="text-left font-medium px-3 py-2">Joined</th>
                <th className="text-right font-medium px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    No agents match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const tEnd = trialEnd(a.created_at);
                const daysLeft = Math.ceil((tEnd.getTime() - Date.now()) / 86400000);
                const trialUrgent = !a.is_subscribed && daysLeft < 7;
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-3 py-2 font-medium text-foreground">{a.name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.email || '—'}</td>
                    <td className="px-3 py-2">
                      <PlanBadge plan={a.plan_type} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={a.subscription_status} isSubscribed={a.is_subscribed} />
                    </td>
                    <td className={cn('px-3 py-2', trialUrgent && 'text-red-600 font-semibold')}>
                      {a.is_subscribed ? '—' : format(tEnd, 'd MMM yyyy')}
                    </td>
                    <td className="px-3 py-2 text-foreground">{a.listings_count}</td>
                    <td className="px-3 py-2">
                      {a.is_approved ? (
                        <ShieldCheck size={16} className="text-emerald-600" />
                      ) : (
                        <ShieldX size={16} className="text-red-600" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {format(new Date(a.created_at), 'd MMM yyyy')}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-popover">
                          {!a.is_approved && (
                            <DropdownMenuItem onClick={() => handleApprove(a.id)}>
                              <ShieldCheck size={14} className="mr-2" /> Approve agent
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleSuspend(a.id)}>
                            <Lock size={14} className="mr-2" /> Suspend agent
                          </DropdownMenuItem>
                          <Popover
                            open={graceOpenFor === a.id}
                            onOpenChange={(o) => setGraceOpenFor(o ? a.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setGraceOpenFor(a.id);
                                }}
                              >
                                <CalendarClock size={14} className="mr-2" /> Grant grace period
                              </DropdownMenuItem>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover" align="end">
                              <Calendar
                                mode="single"
                                selected={
                                  a.admin_grace_until ? new Date(a.admin_grace_until) : undefined
                                }
                                onSelect={(d) => handleGrace(a.id, d)}
                                disabled={(d) => d < new Date()}
                                initialFocus
                                className={cn('p-3 pointer-events-auto')}
                              />
                            </PopoverContent>
                          </Popover>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResetTrial(a.id)}>
                            <RotateCcw size={14} className="mr-2" /> Reset to trial
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
