import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTeamAgents } from '@/features/agents/hooks/useTeamAgents';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  agent_id: string | null;
  action_type: string;
  entity_type: string;
  description: string | null;
  created_at: string;
  metadata: any;
}

const PAGE_SIZE = 50;

export default function AuditLogTab() {
  const { agencyId } = useAuth();
  const { agents } = useTeamAgents();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [agentFilter, setAgentFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLog = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (agentFilter !== 'all') {
      query = query.eq('agent_id', agentFilter);
    }
    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }

    const { data, count, error } = await query as any;
    if (!error) {
      setEntries(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [agencyId, page, agentFilter, actionFilter]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const agentName = (agentId: string | null) => {
    if (!agentId) return '—';
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="reassigned">Reassigned</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{total} entries</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : entries.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No audit log entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-3 font-medium">Time</th>
                <th className="text-left py-3 px-3 font-medium">Agent</th>
                <th className="text-left py-3 px-3 font-medium">Action</th>
                <th className="text-left py-3 px-3 font-medium">Entity</th>
                <th className="text-left py-3 px-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('en-AU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{agentName(entry.agent_id)}</td>
                  <td className="py-2.5 px-3 capitalize">{entry.action_type}</td>
                  <td className="py-2.5 px-3 capitalize text-muted-foreground">{entry.entity_type}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{entry.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
