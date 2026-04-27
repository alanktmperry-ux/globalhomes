import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface Ticket {
  id: string;
  subject: string | null;
  body: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_by_email: string | null;
  created_by_name: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
}

type RequestStatus = 'under_review' | 'planned' | 'in_progress' | 'shipped' | 'declined';

interface FeatureRequest {
  id: string;
  title: string | null;
  description: string | null;
  status: RequestStatus;
  votes: number | null;
  submitted_by_email: string | null;
  created_at: string;
  tags: string[] | null;
}

const PRIORITY_CLS: Record<TicketPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-stone-100 text-stone-600',
};
const TICKET_STATUS_CLS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-stone-100 text-stone-500',
};
const REQUEST_STATUS_CLS: Record<RequestStatus, string> = {
  under_review: 'bg-stone-100 text-stone-600',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  shipped: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
};
const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  declined: 'Declined',
};

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[12px] font-medium border transition ${
        active
          ? 'bg-stone-900 text-white border-stone-900'
          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
      }`}
    >
      {children}
    </button>
  );
}

function KpiChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-2xl font-semibold mt-0.5 text-stone-900">{value}</div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="bg-blue-600 text-white text-[11px] rounded-full px-1.5 py-0.5 ml-1.5">
      {count}
    </span>
  );
}

// ─────────── TICKETS TAB ───────────
function TicketsTab({ tickets, setTickets }: { tickets: Ticket[]; setTickets: React.Dispatch<React.SetStateAction<Ticket[]>> }) {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');

  const filtered = useMemo(() =>
    tickets.filter((t) =>
      (statusFilter === 'all' || t.status === statusFilter) &&
      (priorityFilter === 'all' || t.priority === priorityFilter)
    ), [tickets, statusFilter, priorityFilter]);

  const kpis = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const critical = tickets.filter((t) => t.priority === 'critical' && t.status !== 'closed').length;
    const resolved = tickets.filter((t) => t.resolved_at);
    const totalDays = resolved.reduce((sum, t) => {
      const d = (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 86400000;
      return sum + d;
    }, 0);
    const avg = resolved.length > 0 ? (totalDays / resolved.length).toFixed(1) : '—';
    const weekAgo = Date.now() - 7 * 86400000;
    const resolvedThisWeek = resolved.filter((t) => new Date(t.resolved_at!).getTime() >= weekAgo).length;
    return { open, critical, avg, resolvedThisWeek };
  }, [tickets]);

  const updateStatus = async (t: Ticket, status: TicketStatus) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'resolved') patch.resolved_at = new Date().toISOString();
    try {
      const { error } = await ((supabase as any).from('support_tickets')).update(patch).eq('id', t.id);
      if (error) throw error;
      setTickets((rows) => rows.map((r) => (r.id === t.id ? { ...r, ...patch } as Ticket : r)));
      toast.success(`Ticket marked ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiChip label="Open tickets" value={kpis.open} />
        <KpiChip label="Critical" value={kpis.critical} />
        <KpiChip label="Avg resolution (days)" value={kpis.avg} />
        <KpiChip label="Resolved this week" value={kpis.resolvedThisWeek} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[12px] text-stone-500 mr-1">Status:</span>
        <Pill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</Pill>
        <Pill active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>Open</Pill>
        <Pill active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>In Progress</Pill>
        <Pill active={statusFilter === 'resolved'} onClick={() => setStatusFilter('resolved')}>Resolved</Pill>
        <Pill active={statusFilter === 'closed'} onClick={() => setStatusFilter('closed')}>Closed</Pill>
        <span className="text-[12px] text-stone-500 ml-3 mr-1">Priority:</span>
        <Pill active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')}>All</Pill>
        <Pill active={priorityFilter === 'critical'} onClick={() => setPriorityFilter('critical')}>Critical</Pill>
        <Pill active={priorityFilter === 'high'} onClick={() => setPriorityFilter('high')}>High</Pill>
        <Pill active={priorityFilter === 'medium'} onClick={() => setPriorityFilter('medium')}>Medium</Pill>
        <Pill active={priorityFilter === 'low'} onClick={() => setPriorityFilter('low')}>Low</Pill>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No tickets yet</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-[12px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">#ID</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-left px-4 py-2 font-medium">From</th>
                <th className="text-left px-4 py-2 font-medium">Priority</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Submitted</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-[12px] text-stone-500">{t.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">{t.subject || '—'}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {t.created_by_name || t.created_by_email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_CLS[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${TICKET_STATUS_CLS[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-[12px]">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus(t, 'in_progress')}>
                          Mark in progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(t, 'resolved')}>
                          Mark resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(t, 'closed')}>
                          Close
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────── FEATURE REQUESTS TAB ───────────
function RequestsTab({ requests, setRequests }: { requests: FeatureRequest[]; setRequests: React.Dispatch<React.SetStateAction<FeatureRequest[]>> }) {
  const [sort, setSort] = useState<'votes' | 'newest'>('votes');

  const sorted = useMemo(() => {
    const arr = [...requests];
    if (sort === 'votes') arr.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    else arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return arr;
  }, [requests, sort]);

  const updateStatus = async (r: FeatureRequest, status: RequestStatus) => {
    try {
      const { error } = await ((supabase as any).from('feature_requests')).update({ status }).eq('id', r.id);
      if (error) throw error;
      setRequests((rows) => rows.map((row) => (row.id === r.id ? { ...row, status } : row)));
      toast.success(`Updated to ${REQUEST_STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] text-stone-500 mr-1">Sort:</span>
        <Pill active={sort === 'votes'} onClick={() => setSort('votes')}>Most votes</Pill>
        <Pill active={sort === 'newest'} onClick={() => setSort('newest')}>Newest</Pill>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No feature requests yet</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-[12px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Title</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-left px-4 py-2 font-medium">Votes</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Tags</th>
                <th className="text-left px-4 py-2 font-medium">Submitted</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-900">{r.title || '—'}</td>
                  <td className="px-4 py-3 text-stone-600 max-w-md">
                    {r.description ? (r.description.length > 100 ? r.description.slice(0, 100) + '…' : r.description) : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-700 font-medium">{r.votes ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${REQUEST_STATUS_CLS[r.status]}`}>
                      {REQUEST_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <div className="flex flex-wrap gap-1">
                      {(r.tags || []).map((tag) => (
                        <span key={tag} className="text-[11px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-[12px]">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(['under_review', 'planned', 'in_progress', 'shipped', 'declined'] as RequestStatus[]).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => updateStatus(r, s)}>
                            {REQUEST_STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────── PAGE ───────────
export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'requests'>('tickets');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const { data, error } = await ((supabase as any).from('support_tickets'))
        .select('id, subject, body, status, priority, created_by_email, created_by_name, agent_id, created_at, updated_at, assigned_to, resolved_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
      setTicketsLoaded(true);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await ((supabase as any).from('feature_requests'))
        .select('id, title, description, status, votes, submitted_by_email, created_at, tags')
        .order('votes', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRequests((data || []) as FeatureRequest[]);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
      setRequestsLoaded(true);
    }
  };

  // initial load: tickets (default tab)
  useEffect(() => {
    if (!ticketsLoaded) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (val: string) => {
    const tab = val as 'tickets' | 'requests';
    setActiveTab(tab);
    if (tab === 'tickets' && !ticketsLoaded) fetchTickets();
    if (tab === 'requests' && !requestsLoaded) fetchRequests();
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const reviewCount = requests.filter((r) => r.status === 'under_review').length;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage support tickets and track feature requests from agents and buyers.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="tickets">
            Tickets<CountBadge count={openCount} />
          </TabsTrigger>
          <TabsTrigger value="requests">
            Feature Requests<CountBadge count={reviewCount} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <TicketsTab tickets={tickets} setTickets={setTickets} />
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requestsLoading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <RequestsTab requests={requests} setRequests={setRequests} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
