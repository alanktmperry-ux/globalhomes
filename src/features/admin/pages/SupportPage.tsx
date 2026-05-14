import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Search, Mail, Clock, Send, RefreshCw, Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/shared/lib/utils';

type Status = 'new' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Ticket {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  subject: string;
  body: string;
  category: string;
  status: Status;
  priority: Priority;
  assigned_to: string | null;
  context: any;
  internal_notes: string | null;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'system';
  body: string;
  created_at: string;
}

const STATUS_TONE: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  waiting_on_user: 'bg-purple-100 text-purple-700 border-purple-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};
const PRIORITY_TONE: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-slate-100 text-slate-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

type Filter = 'all' | 'open' | Status;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, created_at, updated_at, email, full_name, subject, body, category, status, priority, assigned_to, context, internal_notes')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('support_tickets_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.message('New support ticket', { description: (payload.new as any).subject });
        }
        loadTickets();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const m = payload.new as Message;
        if (m.ticket_id === selectedId) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets, selectedId]);

  // Load messages for selected
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('id, ticket_id, sender_type, body, created_at')
        .eq('ticket_id', selectedId)
        .order('created_at', { ascending: true });
      setMessages((data ?? []) as Message[]);
    })();
    const t = tickets.find((x) => x.id === selectedId);
    setInternalNotes(t?.internal_notes ?? '');
    setReply('');
  }, [selectedId, tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === 'open' && (t.status === 'resolved' || t.status === 'closed')) return false;
      if (filter !== 'all' && filter !== 'open' && t.status !== filter) return false;
      if (q && !`${t.subject} ${t.email} ${t.full_name ?? ''} ${t.body}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, filter, search]);

  const counts = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length,
      new: tickets.filter((t) => t.status === 'new').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      waiting_on_user: tickets.filter((t) => t.status === 'waiting_on_user').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
    };
  }, [tickets]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const updateTicket = async (id: string, patch: Partial<Ticket>) => {
    const { error } = await supabase.from('support_tickets').update(patch as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as Ticket : t)));
    toast.success('Updated');
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('reply-support-ticket', {
        body: { ticket_id: selected.id, body: reply.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Reply sent');
      setReply('');
      // reload messages
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('id, ticket_id, sender_type, body, created_at')
        .eq('ticket_id', selected.id)
        .order('created_at', { ascending: true });
      setMessages((msgs ?? []) as Message[]);
      loadTickets();
    } catch (e: any) {
      toast.error(e?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="text-primary" /> Support</h1>
          <p className="text-sm text-muted-foreground">{counts.open} open · {counts.new} new · {counts.in_progress} in progress · {counts.waiting_on_user} waiting on user</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTickets}><RefreshCw size={14} className="mr-2" /> Refresh</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, email, message…" className="pl-9" />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
            <TabsTrigger value="in_progress">In progress</TabsTrigger>
            <TabsTrigger value="waiting_on_user">Waiting</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No tickets match this filter.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="p-4 hover:bg-accent/40 cursor-pointer flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border', STATUS_TONE[t.status])}>{t.status.replace('_',' ')}</span>
                    <span className={cn('text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded', PRIORITY_TONE[t.priority])}>{t.priority}</span>
                    <Badge variant="outline" className="text-[10px]">{t.category.replace('_',' ')}</Badge>
                  </div>
                  <p className="font-semibold mt-1 truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.full_name ? `${t.full_name} · ` : ''}{t.email}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock size={11} /> {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{selected.subject}</SheetTitle>
                <SheetDescription>
                  <span className="inline-flex items-center gap-1"><Mail size={12} />{selected.email}</span>
                  {selected.full_name ? ` · ${selected.full_name}` : ''} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Status</label>
                  <Select value={selected.status} onValueChange={(v) => updateTicket(selected.id, { status: v as Status, ...(v === 'resolved' ? {} : {}) })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="waiting_on_user">Waiting on user</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Priority</label>
                  <Select value={selected.priority} onValueChange={(v) => updateTicket(selected.id, { priority: v as Priority })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Category</label>
                  <div className="h-9 flex items-center text-sm capitalize">{selected.category.replace('_',' ')}</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Conversation</h3>
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded p-3">No messages yet — original ticket body below.</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-lg p-3 text-sm whitespace-pre-wrap',
                        m.sender_type === 'admin' ? 'bg-primary/10 border border-primary/20' :
                        m.sender_type === 'system' ? 'bg-slate-50 border border-slate-200 text-slate-600 italic' :
                        'bg-card border border-border',
                      )}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-muted-foreground">
                        {m.sender_type === 'admin' ? 'You' : m.sender_type === 'system' ? 'System' : (selected.full_name || selected.email)}
                        <span className="ml-2 font-normal normal-case tracking-normal">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                      </div>
                      {m.body}
                    </div>
                  ))
                )}

                {messages.length === 0 && (
                  <div className="rounded-lg p-3 text-sm whitespace-pre-wrap bg-card border border-border">
                    {selected.body}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Reply</h3>
                <Textarea
                  rows={5} value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to the customer. They'll receive this by email."
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">Sending will set status to <strong>Waiting on user</strong>.</p>
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <><Loader2 className="animate-spin mr-2" size={14} />Sending</> : <><Send size={14} className="mr-2" />Send reply</>}
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Internal notes</h3>
                <Textarea
                  rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private notes for the team. Not shown to the customer."
                  onBlur={() => {
                    if (internalNotes !== (selected.internal_notes ?? '')) {
                      updateTicket(selected.id, { internal_notes: internalNotes });
                    }
                  }}
                />
              </div>

              {selected.context && (
                <div className="mt-6">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Context</h3>
                  <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(selected.context, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
