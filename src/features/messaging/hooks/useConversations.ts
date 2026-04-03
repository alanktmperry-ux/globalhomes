import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationParticipant {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  type: string;
  lead_id: string | null;
  property_id: string | null;
  title: string | null;
  last_message_at: string;
  last_message_text: string | null;
  unread_count: number;
  participants: ConversationParticipant[];
  // Legacy fields for backward compat
  participant_1?: string;
  participant_2?: string;
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Get all conversations this user participates in (via conversation_participants)
    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count')
      .eq('user_id', userId);

    if (!participantRows || participantRows.length === 0) {
      // Fallback: check legacy participant_1/participant_2
      const { data: legacyConvos } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (legacyConvos && legacyConvos.length > 0) {
        const enriched = await enrichConversations(legacyConvos, userId, {});
        setConversations(enriched);
      } else {
        setConversations([]);
      }
      setLoading(false);
      return;
    }

    const ids = participantRows.map(r => r.conversation_id);
    const unreadMap = Object.fromEntries(
      participantRows.map(r => [r.conversation_id, r.unread_count])
    );

    const { data: convRows } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('last_message_at', { ascending: false });

    if (convRows) {
      const enriched = await enrichConversations(convRows, userId, unreadMap);
      setConversations(enriched);
    }
    setLoading(false);
  }, [userId]);

  const enrichConversations = async (
    convRows: any[],
    currentUserId: string,
    unreadMap: Record<string, number>
  ): Promise<Conversation[]> => {
    // Get all participants for these conversations
    const convIds = convRows.map(c => c.id);
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds);

    // Get unique user IDs for profile lookup
    const allUserIds = new Set<string>();
    (allParticipants ?? []).forEach(p => allUserIds.add(p.user_id));
    // Also add legacy participant_1/participant_2
    convRows.forEach(c => {
      if (c.participant_1) allUserIds.add(c.participant_1);
      if (c.participant_2) allUserIds.add(c.participant_2);
    });

    // Batch fetch profiles
    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    const userIdArray = [...allUserIds];

    if (userIdArray.length > 0) {
      // Fetch from agents first
      const { data: agents } = await supabase
        .from('agents')
        .select('user_id, name, avatar_url')
        .in('user_id', userIdArray);

      (agents ?? []).forEach(a => {
        profileMap[a.user_id] = { display_name: a.name, avatar_url: a.avatar_url };
      });

      // Fetch remaining from profiles
      const remainingIds = userIdArray.filter(id => !profileMap[id]);
      if (remainingIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', remainingIds);

        (profiles ?? []).forEach(p => {
          profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        });
      }
    }

    return convRows.map(c => {
      // Get participants from conversation_participants table
      const cpRows = (allParticipants ?? []).filter(p => p.conversation_id === c.id);
      let participants: ConversationParticipant[];

      if (cpRows.length > 0) {
        participants = cpRows.map(p => ({
          user_id: p.user_id,
          display_name: profileMap[p.user_id]?.display_name ?? null,
          avatar_url: profileMap[p.user_id]?.avatar_url ?? null,
        }));
      } else {
        // Fallback to legacy participant_1/participant_2
        const ids = [c.participant_1, c.participant_2].filter(Boolean);
        participants = ids.map((id: string) => ({
          user_id: id,
          display_name: profileMap[id]?.display_name ?? null,
          avatar_url: profileMap[id]?.avatar_url ?? null,
        }));
      }

      // Determine unread: prefer conversation_participants, fallback to legacy
      let unread = unreadMap[c.id] ?? 0;

      return {
        id: c.id,
        type: c.type ?? 'direct',
        lead_id: c.lead_id ?? null,
        property_id: c.property_id ?? null,
        title: c.title ?? null,
        last_message_at: c.last_message_at,
        last_message_text: c.last_message_text ?? null,
        unread_count: unread,
        participants,
        participant_1: c.participant_1,
        participant_2: c.participant_2,
      };
    });
  };

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when participant rows or conversations change
  useEffect(() => {
    if (!userId) return;
    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`conv_list:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, () => load())
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [userId, load]);

  const markRead = useCallback(async (conversationId: string) => {
    if (!userId) return;

    // Update conversation_participants
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Also mark legacy messages as read
    await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    );
  }, [userId]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return { conversations, loading, reload: load, markRead, totalUnread };
}
