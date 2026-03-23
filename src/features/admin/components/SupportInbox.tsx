import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare, Lightbulb, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, RefreshCw, ThumbsUp, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  agent_id: string | null;
  submitter_name: string;
  submitter_email: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  agentName?: string;
}

interface FeatureRequest {
  id: string;
  agent_id: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  upvote_count: number;
  admin_response: string | null;
  created_at: string;
  agentName?: string;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: RefreshCw },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-secondary text-muted-foreground border-border', icon: XCircle },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  normal: { label: 'Normal', color: 'text-foreground' },
  high: { label: 'High', color: 'text-amber-600' },
  urgent: { label: 'Urgent', color: 'text-destructive' },
};

const FR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-secondary text-muted-foreground' },
  under_review: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-700' },
  planned: { label: 'Planned', color: 'bg-primary/10 text-primary' },
  in_progress: { label: 'Building', color: 'bg-amber-500/10 text-amber-700' },
  shipped: { label: 'Shipped ✓', color: 'bg-emerald-500/10 text-emerald-600' },
  declined: { label: 'Declined', color: 'bg-secondary text-muted-foreground' },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', billing: 'Billing', technical: 'Technical',
  trust_accounting: 'Trust', listings: 'Listings', other: 'Other',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

function TicketRow({ ticket, onUpdate }: { ticket: Ticket; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(ticket.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const sc = STATUS_CONFIG[ticket.status];
  const pc = PRIORITY_CONFIG[ticket.priority];
  const StatusIcon = sc.icon;

  const updateTicket = async (updates: Partial<Ticket>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', ticket.id);
      if (error) throw error;
      toast.success('Ticket updated');
      onUpdate();
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status: Ticket['status']) => {
    const updates: Partial<Ticket> = { status };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    updateTicket(updates);
  };

  const urgentBorder = ticket.priority === 'urgent' ? 'border-destructive/30' : ticket.priority === 'high' ? 'border-amber-500/30' : 'border-border';

  return (
    <div className={`border ${urgentBorder} rounded-xl overflow-hidden`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.priority === 'urgent' ? 'bg-destructive' : ticket.priority === 'high' ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${sc.color}`}>
              <StatusIcon size={8} className="inline mr-0.5" />
              {sc.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
            <span className={`text-[10px] font-medium ${pc.color}`}>{pc.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ticket.submitter_name} · {ticket.submitter_email}
            {ticket.agentName && ` · Agent: ${ticket.agentName}`}
          </p>
          <p className="text-[10px] text-muted-foreground">{fmtDate(ticket.created_at)}</p>
        </div>
        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/10 p-4 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{ticket.description}</p>

          <div className="flex gap-2 flex-wrap">
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} disabled={ticket.status === s || saving}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${ticket.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
            <a href={`mailto:${ticket.submitter_email}?subject=Re: ${ticket.subject}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium ml-auto"
              onClick={e => e.stopPropagation()}>
              <Send size={10} />
              Reply by email
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Internal notes</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add internal notes, resolution steps..." className="text-xs min-h-[70px] resize-none" />
            <Button size="sm" onClick={() => updateTicket({ admin_notes: notes } as any)} disabled={saving} className="text-xs gap-1.5">Save notes</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureRow({ fr, onUpdate }: { fr: FeatureRequest; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(fr.admin_response || '');
  const [saving, setSaving] = useState(false);

  const frc = FR_STATUS_CONFIG[fr.status] || FR_STATUS_CONFIG.submitted;

  const updateFR = async (updates: Partial<FeatureRequest>) => {
    setSaving(true);
    try {
      await supabase.from('feature_requests').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', fr.id);
      toast.success('Updated');
      onUpdate();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2 w-12 shrink-0">
          <ThumbsUp size={12} className="text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">{fr.upvote_count}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{fr.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${frc.color}`}>{frc.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{fr.category}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fr.description}</p>
          <p className="text-[10px] text-muted-foreground">{fr.agentName || 'Unknown agent'} · {fmtDate(fr.created_at)}</p>
        </div>
        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/10 p-4 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{fr.description}</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(FR_STATUS_CONFIG).map(([s, cfg]) => (
              <button key={s} onClick={() => updateFR({ status: s })} disabled={fr.status === s || saving}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${fr.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Public response to agent</p>
            <Textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Share your plans or reasoning with the agent..." className="text-xs min-h-[70px] resize-none" />
            <Button size="sm" onClick={() => updateFR({ admin_response: response })} disabled={saving} className="text-xs">Save response</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportInbox() {
  const [tab, setTab] = useState<'tickets' | 'features'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('open');
  const [featureSort, setFeatureSort] = useState<'votes' | 'recent'>('votes');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, featuresRes, agentsRes] = await Promise.all([
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('feature_requests').select('*').order('upvote_count', { ascending: false }),
        supabase.from('agents').select('id, name'),
      ]);

      const agentMap = new Map<string, string>();
      (agentsRes.data || []).forEach((a: any) => agentMap.set(a.id, a.name));

      setTickets((ticketsRes.data || []).map((t: any) => ({ ...t, agentName: t.agent_id ? agentMap.get(t.agent_id) : undefined })));
      setFeatures((featuresRes.data || []).map((f: any) => ({ ...f, agentName: f.agent_id ? agentMap.get(f.agent_id) : undefined })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredTickets = tickets.filter(t => ticketFilter === 'all' ? true : t.status === ticketFilter);
  const sortedFeatures = [...features].sort((a, b) => featureSort === 'votes' ? b.upvote_count - a.upvote_count : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const openCount = tickets.filter(t => t.status === 'open').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status === 'open').length;
  const topRequested = features[0]?.title || '—';

  const tabs = [
    { id: 'tickets' as const, label: 'Support Tickets', icon: MessageSquare, badge: openCount },
    { id: 'features' as const, label: 'Feature Requests', icon: Lightbulb, badge: features.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Support & Feedback</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Agent support tickets and feature requests</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-card border rounded-xl p-3 text-center ${urgentCount > 0 ? 'border-destructive/30' : 'border-border'}`}>
          <p className={`text-xl font-bold ${urgentCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{urgentCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Urgent open tickets</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-500">{openCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Open tickets</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{features.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Feature requests</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={14} />
            {t.label}
            {t.badge > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === t.id && t.id === 'tickets' && openCount > 0 ? 'bg-amber-500/20 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'open' as const, label: `Open (${tickets.filter(t => t.status === 'open').length})` },
              { key: 'in_progress' as const, label: `In Progress (${tickets.filter(t => t.status === 'in_progress').length})` },
              { key: 'resolved' as const, label: `Resolved (${tickets.filter(t => t.status === 'resolved').length})` },
              { key: 'all' as const, label: `All (${tickets.length})` },
            ]).map(f => (
              <button key={f.key} onClick={() => setTicketFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${ticketFilter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.2} />
              <p className="text-sm text-muted-foreground">No tickets in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map(t => <TicketRow key={t.id} ticket={t} onUpdate={fetchAll} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'features' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {([
                { key: 'votes' as const, label: 'Most voted' },
                { key: 'recent' as const, label: 'Most recent' },
              ]).map(s => (
                <button key={s.key} onClick={() => setFeatureSort(s.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${featureSort === s.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {features.length > 0 && (
              <p className="text-xs text-muted-foreground">Most requested: <span className="font-medium text-foreground">{topRequested}</span></p>
            )}
          </div>

          {sortedFeatures.length === 0 ? (
            <div className="text-center py-16">
              <Lightbulb size={32} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.2} />
              <p className="text-sm text-muted-foreground">No feature requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFeatures.map(f => <FeatureRow key={f.id} fr={f} onUpdate={fetchAll} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
