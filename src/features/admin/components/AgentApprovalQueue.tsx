import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, UserCheck, Inbox } from 'lucide-react';
import { dispatchNotification } from '@/shared/lib/notify';

interface PendingAgent {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  agency: string | null;
  license_number: string | null;
  created_at: string;
}

interface AgentApprovalQueueProps {
  onPendingCountChange?: (count: number) => void;
}

export default function AgentApprovalQueue({ onPendingCountChange }: AgentApprovalQueueProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<PendingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('id, user_id, name, email, agency, license_number, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch pending agents:', error);
      toast({ title: 'Error loading pending agents', variant: 'destructive' });
    }
    const list = (data as PendingAgent[]) || [];
    setAgents(list);
    onPendingCountChange?.(list.length);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (agent: PendingAgent) => {
    setActionLoading(agent.id);
    const { error } = await (supabase.from('agents') as any)
      .update({ approval_status: 'approved' })
      .eq('id', agent.id);

    if (error) {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
      setActionLoading(null);
      return;
    }

    // Send notification to agent (routed through dispatcher)
    await dispatchNotification({
      agent_id: agent.id,
      event_key: 'agent_approved',
      title: 'Your agent account has been approved',
      message: 'Your ListHQ agent account is now active. You can create and publish listings.',
    });

    toast({ title: `${agent.name} approved` });
    setActionLoading(null);
    fetchPending();
  };

  const handleReject = async (agent: PendingAgent) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Please provide a rejection reason', variant: 'destructive' });
      return;
    }
    setActionLoading(agent.id);
    const { error } = await (supabase.from('agents') as any)
      .update({ approval_status: 'rejected' })
      .eq('id', agent.id);

    if (error) {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
      setActionLoading(null);
      return;
    }

    await supabase.from('notifications').insert({
      agent_id: agent.id,
      type: 'agent_rejected',
      title: 'Agent application not approved',
      message: rejectionReason.trim(),
      is_read: false,
    } as any).then(({ error: nErr }) => { if (nErr) console.error('notification insert failed:', nErr); });

    toast({ title: `${agent.name} rejected` });
    setActionLoading(null);
    setRejectingId(null);
    setRejectionReason('');
    fetchPending();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck size={22} className="text-primary" />
        <h2 className="text-xl font-bold">Agent Approval Queue</h2>
        {agents.length > 0 && (
          <Badge variant="destructive" className="text-xs">{agents.length} pending</Badge>
        )}
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Inbox size={40} className="opacity-40" />
          <p className="text-sm">No agents awaiting approval</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Agent Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Agency</th>
                <th className="text-left px-4 py-3 font-medium">Licence</th>
                <th className="text-left px-4 py-3 font-medium">Registered</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agent.email || '—'}</td>
                  <td className="px-4 py-3">{agent.agency || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{agent.license_number || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(agent.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {rejectingId === agent.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="h-8 text-xs w-48"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            disabled={actionLoading === agent.id}
                            onClick={() => handleReject(agent)}
                          >
                            {actionLoading === agent.id ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={actionLoading === agent.id}
                            onClick={() => handleApprove(agent)}
                          >
                            {actionLoading === agent.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <><CheckCircle2 size={14} className="mr-1" /> Approve</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            disabled={actionLoading === agent.id}
                            onClick={() => setRejectingId(agent.id)}
                          >
                            <XCircle size={14} className="mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
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
