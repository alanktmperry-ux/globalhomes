import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useViewerLocale, getViewerLocale } from '@/features/auth/hooks/useViewerLocale';

export interface SenderProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  original_body: string | null;
  original_lang: string | null;
  translated_bodies: Record<string, string> | null;
  translation_status: string | null;
  created_at: string;
  sender?: SenderProfile;
}

export interface ChatMessage extends ChatMessageRow {
  displayBody: string;
  isTranslated: boolean;
  translationSource: string | null;
}

const SELECT_COLUMNS =
  'id, conversation_id, sender_id, content, original_body, original_lang, translated_bodies, translation_status, created_at';

function resolveDisplay(
  msg: ChatMessageRow,
  viewerLocale: string
): { displayBody: string; isTranslated: boolean; translationSource: string | null } {
  const fallback = msg.original_body || msg.content || '';
  const origLang = (msg.original_lang || 'en').split('-')[0].split('_')[0];
  const vLoc = (viewerLocale || 'en').split('-')[0].split('_')[0];

  if (origLang === vLoc) {
    return { displayBody: fallback, isTranslated: false, translationSource: null };
  }
  const cached = msg.translated_bodies?.[vLoc] || msg.translated_bodies?.[viewerLocale];
  if (cached && cached.trim()) {
    return { displayBody: cached, isTranslated: true, translationSource: origLang };
  }
  return { displayBody: fallback, isTranslated: false, translationSource: origLang };
}

export function useMessages(conversationId: string | null) {
  const [rows, setRows] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const profileCache = useRef<Record<string, SenderProfile>>({});
  const viewerLocale = useViewerLocale();

  const fetchProfile = useCallback(async (userId: string): Promise<SenderProfile> => {
    if (profileCache.current[userId]) return profileCache.current[userId];

    const { data: agent } = await supabase
      .from('agents')
      .select('name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (agent) {
      const p: SenderProfile = { display_name: agent.name, avatar_url: agent.avatar_url };
      profileCache.current[userId] = p;
      return p;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    const p: SenderProfile = {
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
    profileCache.current[userId] = p;
    return p;
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!conversationId) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('messages')
        .select(SELECT_COLUMNS)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (cancelled) return;
      const msgs = (data ?? []) as unknown as ChatMessageRow[];

      const uniqueSenders = [...new Set(msgs.map(m => m.sender_id))];
      await Promise.all(uniqueSenders.map(id => fetchProfile(id)));

      setRows(msgs.map(m => ({ ...m, sender: profileCache.current[m.sender_id] })));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [conversationId, fetchProfile]);

  // Realtime — INSERT + UPDATE so translated_bodies swap in live
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as ChatMessageRow;
        const sender = await fetchProfile(newMsg.sender_id);
        setRows(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender }];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as ChatMessageRow;
        setRows(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, sender: m.sender } : m));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [conversationId, fetchProfile]);

  // Derive displayBody whenever viewerLocale or rows change
  const messages = useMemo<ChatMessage[]>(() => {
    return rows.map(m => ({ ...m, ...resolveDisplay(m, viewerLocale) }));
  }, [rows, viewerLocale]);

  const sendMessage = useCallback(async (content: string, senderId: string) => {
    if (!conversationId || !content.trim()) return;
    const trimmed = content.trim();
    const senderLocale = await getViewerLocale();

    const { data: inserted, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed,
      original_body: trimmed,
      original_lang: senderLocale || 'en',
      translation_status: 'pending',
    }).select('id').maybeSingle();

    // Kick translate-message for faster perceived latency (trigger also fires)
    if (!error && inserted?.id) {
      supabase.functions.invoke('translate-message', { body: { messageId: inserted.id } }).catch(() => {});
    }

    // Fire-and-forget: email the other participant
    if (!error) {
      (async () => {
        try {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', senderId);

          if (otherParticipants && otherParticipants.length > 0) {
            const otherId = otherParticipants[0].user_id;
            const { data: agentRow } = await supabase.from('agents').select('email, name').eq('user_id', otherId).maybeSingle();
            const recipientEmail = agentRow?.email;
            const recipientName = agentRow?.name || 'there';

            if (recipientEmail) {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  type: 'new_message',
                  recipient_email: recipientEmail,
                  lead_name: recipientName,
                  title: 'You have a new message',
                  message: `You have a new message on ListHQ. Log in to reply: https://listhq.com.au/messages`,
                },
              });
            }
          }
        } catch { /* silent */ }
      })();
    }

    return error;
  }, [conversationId]);

  return { messages, loading, sendMessage, viewerLocale };
}
