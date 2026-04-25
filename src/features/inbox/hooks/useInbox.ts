import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export type InboxFilter = 'all' | 'unread' | 'mine' | 'snoozed' | 'closed';
export type InboxChannel = 'email' | 'in_app';
export type InboxStatus = 'open' | 'snoozed' | 'closed';

export interface InboxThreadRow {
  id: string;
  agency_id: string;
  contact_id: string | null;
  lead_id: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  is_unread: boolean;
  assigned_agent_id: string | null;
  status: InboxStatus;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    avatar_url: string | null;
    preferred_language: string | null;
  } | null;
  last_channel?: InboxChannel | null;
}

export interface InboxMessageRow {
  id: string;
  thread_id: string;
  channel: InboxChannel;
  direction: 'inbound' | 'outbound';
  sender_type: 'agent' | 'contact' | 'system';
  sender_id: string | null;
  body: string;
  body_html: string | null;
  attachments: any;
  external_id: string | null;
  sent_at: string;
  read_at: string | null;
  created_at: string;
}

export function useAgentContext() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, agency_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setAgentId(data.id);
        setAgencyId(data.agency_id);
      }
    })();
  }, [user]);

  return { agentId, agencyId };
}

export function useInboxThreads(filter: InboxFilter, search: string) {
  const { agentId, agencyId } = useAgentContext();
  const [threads, setThreads] = useState<InboxThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!agencyId) { setLoading(false); return; }
    setLoading(true);

    let q = supabase
      .from('inbox_threads' as any)
      .select('*, contact:contact_id(id, first_name, last_name, email, phone, mobile, avatar_url, preferred_language)')
      .eq('agency_id', agencyId)
      .order('last_message_at', { ascending: false })
      .limit(200);

    if (filter === 'unread') q = q.eq('is_unread', true).neq('status', 'closed');
    else if (filter === 'mine') q = q.eq('assigned_agent_id', agentId).neq('status', 'closed');
    else if (filter === 'snoozed') q = q.eq('status', 'snoozed');
    else if (filter === 'closed') q = q.eq('status', 'closed');
    else q = q.neq('status', 'closed');

    const { data, error } = await q;
    if (error) {
      console.error('[useInboxThreads] error', error);
      setThreads([]);
    } else {
      let rows = ((data as any[]) || []) as InboxThreadRow[];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        rows = rows.filter(t => {
          const c = t.contact;
          const name = c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase() : '';
          return (
            (t.subject || '').toLowerCase().includes(s) ||
            (t.last_message_preview || '').toLowerCase().includes(s) ||
            name.includes(s) ||
            (c?.email || '').toLowerCase().includes(s)
          );
        });
      }
      setThreads(rows);
    }
    setLoading(false);
  }, [agencyId, agentId, filter, search]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh on any thread change in this agency
  useEffect(() => {
    if (!agencyId) return;
    const channel = supabase
      .channel(`inbox_threads_${agencyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_threads', filter: `agency_id=eq.${agencyId}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agencyId, load]);

  const counts = useMemo(() => {
    const unreadCount = threads.filter(t => t.is_unread && t.status !== 'closed').length;
    return { unread: unreadCount };
  }, [threads]);

  return { threads, loading, reload: load, counts, agentId, agencyId };
}

export function useInboxMessages(threadId: string | null) {
  const [messages, setMessages] = useState<InboxMessageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!threadId) { setMessages([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('inbox_messages' as any)
      .select('*')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true });
    setMessages(((data as any[]) || []) as InboxMessageRow[]);
    setLoading(false);
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`inbox_messages_${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_messages', filter: `thread_id=eq.${threadId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, load]);

  return { messages, loading, reload: load };
}

export async function markThreadRead(threadId: string) {
  await supabase.from('inbox_threads' as any).update({ is_unread: false }).eq('id', threadId);
}

export async function setThreadStatus(threadId: string, status: InboxStatus, snoozedUntil?: string | null) {
  await supabase
    .from('inbox_threads' as any)
    .update({ status, snoozed_until: snoozedUntil ?? null })
    .eq('id', threadId);
}

export async function assignThread(threadId: string, agentId: string | null) {
  await supabase.from('inbox_threads' as any).update({ assigned_agent_id: agentId }).eq('id', threadId);
}

export async function sendInboxMessage(opts: {
  threadId: string;
  channel: InboxChannel;
  body: string;
  bodyHtml?: string | null;
  agentId: string;
  recipientEmail?: string | null;
  subject?: string | null;
}) {
  // 1. Insert outbound message immediately (the trigger updates the thread)
  const { data: msg, error } = await supabase
    .from('inbox_messages' as any)
    .insert({
      thread_id: opts.threadId,
      channel: opts.channel,
      direction: 'outbound',
      sender_type: 'agent',
      sender_id: opts.agentId,
      body: opts.body,
      body_html: opts.bodyHtml ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. For email channel, fire send-notification-email (best-effort, don't fail message log)
  if (opts.channel === 'email' && opts.recipientEmail) {
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: opts.recipientEmail,
          subject: opts.subject || 'New message',
          html: opts.bodyHtml || `<p>${opts.body.replace(/\n/g, '<br/>')}</p>`,
        },
      });
    } catch (e) {
      console.error('[sendInboxMessage] email dispatch failed', e);
    }
  }

  return msg;
}

export async function findOrCreateThreadForContact(opts: {
  agencyId: string;
  contactId: string;
  agentId: string | null;
  subject?: string | null;
}): Promise<string> {
  // Reuse open thread for this contact, otherwise create
  const { data: existing } = await supabase
    .from('inbox_threads' as any)
    .select('id')
    .eq('agency_id', opts.agencyId)
    .eq('contact_id', opts.contactId)
    .neq('status', 'closed')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if ((existing as any)?.id) return (existing as any).id;

  const { data: created, error } = await supabase
    .from('inbox_threads' as any)
    .insert({
      agency_id: opts.agencyId,
      contact_id: opts.contactId,
      assigned_agent_id: opts.agentId,
      subject: opts.subject ?? null,
      last_message_preview: '',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (created as any).id;
}
