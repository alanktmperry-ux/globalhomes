import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, ArrowLeft, Send, User, Building2, PenSquare } from 'lucide-react';
import { NewMessageDialog } from '@/features/user/components/NewMessageDialog';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { useI18n } from '@/shared/lib/i18n';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  property_id: string | null;
  last_message_at: string;
  created_at: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_id: string;
  property_title?: string;
  property_address?: string;
  property_image?: string | null;
  last_message_text?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const MessagesPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMsgDialogOpen, setNewMsgDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const getConversationKey = (otherUserId: string, propertyId: string | null) => {
    if (!otherUserId) return null;
    return `${otherUserId}:${propertyId || 'none'}`;
  };

  // Fetch legacy leads as pseudo-conversations for agents/buyers
  const fetchLegacyLeads = useCallback(async (): Promise<Conversation[]> => {
    if (!user) return [];

    // Check if user is agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (agent) {
      const { data: leads } = await supabase
        .from('leads')
        .select('*, properties:property_id(title, address, image_url)')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!leads || leads.length === 0) return [];

      return leads.map((l: any) => ({
        id: `lead-${l.id}`,
        participant_1: user.id,
        participant_2: l.user_id || '',
        property_id: l.property_id,
        last_message_at: l.created_at,
        created_at: l.created_at,
        other_user_name: l.user_name,
        other_user_avatar: null,
        other_user_id: l.user_id || '',
        property_title: l.properties?.title,
        property_address: l.properties?.address,
        property_image: l.properties?.image_url,
        last_message_text: l.message || 'New enquiry',
        unread_count: l.status === 'new' ? 1 : 0,
      }));
    }

    // Buyer: show leads they sent
    const { data: leads } = await supabase
      .from('leads')
      .select('*, properties:property_id(title, address, image_url), agents:agent_id(name, avatar_url, user_id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!leads || leads.length === 0) return [];

    return leads.map((l: any) => ({
      id: `lead-${l.id}`,
      participant_1: user.id,
      participant_2: l.agents?.user_id || '',
      property_id: l.property_id,
      last_message_at: l.created_at,
      created_at: l.created_at,
      other_user_name: l.agents?.name || 'Agent',
      other_user_avatar: l.agents?.avatar_url,
      other_user_id: l.agents?.user_id || '',
      property_title: l.properties?.title,
      property_address: l.properties?.address,
      property_image: l.properties?.image_url,
      last_message_text: l.message || 'Your enquiry',
      unread_count: 0,
    }));
  }, [user]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    const convoRows = convos ?? [];

    const enriched = await Promise.all(
      convoRows.map(async (c: any) => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;

        // Get other user's display info (check agents first, then profiles)
        let otherName = 'User';
        let otherAvatar: string | null = null;

        const { data: agentData } = await supabase
          .from('agents')
          .select('name, avatar_url')
          .eq('user_id', otherId)
          .maybeSingle();

        if (agentData) {
          otherName = agentData.name;
          otherAvatar = agentData.avatar_url;
        } else {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', otherId)
            .maybeSingle();
          if (profileData) {
            otherName = profileData.display_name || 'User';
            otherAvatar = profileData.avatar_url;
          }
        }

        // Get property info if linked
        let propTitle: string | undefined;
        let propAddress: string | undefined;
        let propImage: string | null | undefined;
        if (c.property_id) {
          const { data: prop } = await supabase
            .from('properties')
            .select('title, address, image_url')
            .eq('id', c.property_id)
            .maybeSingle();
          if (prop) {
            propTitle = prop.title;
            propAddress = prop.address;
            propImage = prop.image_url;
          }
        }

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...c,
          other_user_name: otherName,
          other_user_avatar: otherAvatar,
          other_user_id: otherId,
          property_title: propTitle,
          property_address: propAddress,
          property_image: propImage,
          last_message_text: lastMsg?.content,
          unread_count: count || 0,
        } as Conversation;
      })
    );

    const legacyConversations = await fetchLegacyLeads();
    const realConversationKeys = new Set(
      enriched
        .map((c) => getConversationKey(c.other_user_id, c.property_id))
        .filter((key): key is string => Boolean(key))
    );

    const merged = [...enriched];
    for (const legacy of legacyConversations) {
      const legacyKey = getConversationKey(legacy.other_user_id, legacy.property_id);
      if (!legacyKey || !realConversationKeys.has(legacyKey)) {
        merged.push(legacy);
      }
    }

    merged.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setConversations(merged);
    setLoading(false);
  }, [fetchLegacyLeads, user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime for new conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConvo || selectedConvo.id.startsWith('lead-')) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConvo.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      // Mark unread as read
      const unreadIds = data
        .filter((m: any) => !m.is_read && m.sender_id !== user?.id)
        .map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    }
  }, [selectedConvo, user]);

  useEffect(() => {
    if (selectedConvo && !selectedConvo.id.startsWith('lead-')) {
      fetchMessages();
    }
  }, [fetchMessages, selectedConvo]);

  // Realtime for new messages in selected conversation
  useEffect(() => {
    if (!selectedConvo || selectedConvo.id.startsWith('lead-')) return;
    const channel = supabase
      .channel(`messages-${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        // Mark as read if from other user
        if (newMsg.sender_id !== user?.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedConvo || sending) return;

    // For legacy lead conversations, create/find a real conversation first
    let convoId = selectedConvo.id;

    if (convoId.startsWith('lead-')) {
      if (!selectedConvo.other_user_id) return;

      const participant_1 = user.id < selectedConvo.other_user_id ? user.id : selectedConvo.other_user_id;
      const participant_2 = user.id < selectedConvo.other_user_id ? selectedConvo.other_user_id : user.id;

      const { data: newConvo, error } = await supabase
        .from('conversations')
        .upsert(
          {
            participant_1,
            participant_2,
            property_id: selectedConvo.property_id,
          },
          { onConflict: 'participant_1,participant_2,property_id' }
        )
        .select('id')
        .single();

      if (error || !newConvo) return;

      convoId = newConvo.id;
      setSelectedConvo((prev) =>
        prev
          ? {
              ...prev,
              id: convoId,
              participant_1,
              participant_2,
            }
          : null
      );
    }

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error: sendError } = await supabase.from('messages').insert({
        conversation_id: convoId,
        sender_id: user.id,
        content,
      });

      if (sendError) {
        setNewMessage(content);
        return;
      }

      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to format message time
  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a');
    return format(d, 'MMM d, h:mm a');
  };

  const isLegacyReadOnly = Boolean(
    selectedConvo?.id.startsWith('lead-') && !selectedConvo?.other_user_id
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="font-display text-xl font-bold text-foreground">{t('nav.messages')}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
            <p className="text-sm">Sign in to view your messages</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {selectedConvo ? (
            <button onClick={() => { setSelectedConvo(null); setMessages([]); fetchConversations(); }} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <h1 className="font-display text-xl font-bold text-foreground truncate">
            {selectedConvo ? selectedConvo.other_user_name : t('nav.messages')}
          </h1>
          {!selectedConvo && conversations.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {conversations.length}
            </span>
          )}
          {!selectedConvo && (
            <button
              onClick={() => setNewMsgDialogOpen(true)}
              className="ml-auto w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              title="New message"
            >
              <PenSquare size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {selectedConvo ? (
            <motion.div
              key="thread"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col"
            >
              {/* Property context */}
              {selectedConvo.property_title && (
                <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 border-b border-border/30">
                  {selectedConvo.property_image ? (
                    <img src={selectedConvo.property_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{selectedConvo.property_title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{selectedConvo.property_address}</p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                {selectedConvo.id.startsWith('lead-') && messages.length === 0 ? (
                  <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isLegacyReadOnly
                        ? 'This enquiry was submitted without a platform account, so in-app chat is unavailable.'
                        : 'This conversation started from an enquiry. Send a message to start chatting.'}
                    </p>
                    {selectedConvo.last_message_text && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-xl text-left">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Original enquiry</p>
                        <p className="text-sm text-foreground">{selectedConvo.last_message_text}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-secondary text-foreground rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {formatMsgTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border/50 bg-background">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isLegacyReadOnly ? 'In-app messaging unavailable for this enquiry' : 'Type a message...'}
                    rows={1}
                    disabled={isLegacyReadOnly}
                    className="flex-1 resize-none rounded-2xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-24 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLegacyReadOnly || !newMessage.trim() || sending}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4"
            >
              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-secondary/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Contact an agent on a listing to start a conversation</p>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConvo(c)}
                      className={`w-full text-left px-4 py-3 rounded-2xl hover:bg-secondary/70 transition-colors flex items-start gap-3 ${
                        c.unread_count > 0 ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                        {c.other_user_avatar ? (
                          <img src={c.other_user_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-foreground">
                            {c.other_user_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${c.unread_count > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                            {c.other_user_name}
                          </span>
                          {c.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                        {c.property_title && (
                          <p className="text-xs text-muted-foreground truncate">{c.property_title}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{c.last_message_text || 'No messages yet'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default MessagesPage;
