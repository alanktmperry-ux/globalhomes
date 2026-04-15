import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SenderProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: SenderProfile;
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const profileCache = useRef<Record<string, SenderProfile>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<SenderProfile> => {
    if (profileCache.current[userId]) return profileCache.current[userId];

    // Try agents first, then profiles
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
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (cancelled) return;
      const msgs = (data ?? []) as ChatMessage[];

      // Enrich with profiles
      const uniqueSenders = [...new Set(msgs.map(m => m.sender_id))];
      await Promise.all(uniqueSenders.map(id => fetchProfile(id)));

      setMessages(msgs.map(m => ({ ...m, sender: profileCache.current[m.sender_id] })));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [conversationId, fetchProfile]);

  // Subscribe to new messages in real time
  useEffect(() => {
    if (!conversationId) return;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        const sender = await fetchProfile(newMsg.sender_id);
        setMessages(prev => [...prev, { ...newMsg, sender }]);
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [conversationId, fetchProfile]);

  const sendMessage = useCallback(async (content: string, senderId: string) => {
    if (!conversationId || !content.trim()) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    });

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
            const { data: profileRow } = await supabase.from('profiles').select('display_name').eq('user_id', otherId).maybeSingle();
            const recipientEmail = agentRow?.email;
            const recipientName = agentRow?.name || profileRow?.display_name || 'there';

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

  return { messages, loading, sendMessage };
}
