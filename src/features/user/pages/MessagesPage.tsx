import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useConversations, Conversation } from '@/features/messaging/hooks/useConversations';
import { ConversationList } from '@/features/messaging/components/ConversationList';
import { MessageThread } from '@/features/messaging/components/MessageThread';
import { NewConversationModal } from '@/features/messaging/components/NewConversationModal';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, ArrowLeft, MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const MessagesPage = () => {
  const { user } = useAuth();
  const { conversations, loading, markRead, totalUnread, reload } = useConversations(user?.id);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const location = useLocation();

  // Handle openConvId from navigation state (e.g. from lead Reply button)
  useEffect(() => {
    const openId = (location.state as any)?.openConvId;
    if (openId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === openId);
      if (conv) {
        setActiveConv(conv);
        markRead(conv.id);
      }
    }
  }, [location.state, conversations]);

  const handleSelect = useCallback((conv: Conversation) => {
    setActiveConv(conv);
    markRead(conv.id);
  }, [markRead]);

  // Also enrich conversations with legacy lead data for agents
  const [leadConversations, setLeadConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agent) return;

      // Get leads that don't have a conversation yet
      const { data: leads } = await supabase
        .from('leads')
        .select('id, user_name, user_email, message, created_at, property_id, read, status, score, user_id, properties:property_id(title, address, image_url)')
        .eq('agent_id', agent.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!leads || leads.length === 0) { setLeadConversations([]); return; }

      // Check which leads already have conversations
      const leadIds = leads.map(l => l.id);
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('lead_id')
        .in('lead_id', leadIds);

      const linkedLeadIds = new Set((existingConvs ?? []).map(c => c.lead_id));

      // Create pseudo-conversations for unlinked leads
      const pseudoConvs: Conversation[] = leads
        .filter(l => !linkedLeadIds.has(l.id))
        .map((l: any) => ({
          id: `lead-${l.id}`,
          type: 'lead_reply' as const,
          lead_id: l.id,
          property_id: l.property_id,
          title: l.user_name ? `Enquiry from ${l.user_name}` : 'Buyer Enquiry',
          last_message_at: l.created_at,
          last_message_text: l.message || 'New enquiry',
          unread_count: l.read ? 0 : 1,
          participants: [{
            user_id: l.user_id || '',
            display_name: l.user_name,
            avatar_url: null,
          }],
        }));

      setLeadConversations(pseudoConvs);
    })();
  }, [user, conversations]);

  // Merge real conversations with lead pseudo-conversations
  const allConversations = [...conversations, ...leadConversations]
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const handleLeadReply = useCallback(async (pseudoConv: Conversation) => {
    if (!user || !pseudoConv.lead_id) return;

    // Create a real conversation from the lead
    const leadId = pseudoConv.lead_id;
    const buyerUserId = pseudoConv.participants[0]?.user_id;

    const p1 = buyerUserId && user.id < buyerUserId ? user.id : buyerUserId || user.id;
    const p2 = buyerUserId && user.id < buyerUserId ? buyerUserId : user.id;

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        type: 'lead_reply',
        lead_id: leadId,
        property_id: pseudoConv.property_id,
        title: pseudoConv.title,
        participant_1: p1,
        participant_2: p2,
      } as any)
      .select()
      .single();

    if (error || !conv) return;

    // Add participants
    const participants = [{ conversation_id: conv.id, user_id: user.id }];
    if (buyerUserId) {
      participants.push({ conversation_id: conv.id, user_id: buyerUserId });
    }
    await supabase.from('conversation_participants').insert(participants as any);

    // Mark lead as read
    await supabase.from('leads').update({ read: true } as any).eq('id', leadId);

    // Reload and select the new conversation
    await reload();
    setActiveConv({
      ...conv,
      unread_count: 0,
      participants: pseudoConv.participants,
      type: 'lead_reply',
      title: pseudoConv.title,
      last_message_text: pseudoConv.last_message_text,
    } as Conversation);
  }, [user, reload]);

  const handleConvSelect = useCallback((conv: Conversation) => {
    if (conv.id.startsWith('lead-')) {
      handleLeadReply(conv);
    } else {
      handleSelect(conv);
    }
  }, [handleSelect, handleLeadReply]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="flex flex-1 min-h-0">
        {/* ── Left panel: conversation list ─── */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card ${
          activeConv ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
              {totalUnread > 0 && (
                <span className="text-xs text-muted-foreground">{totalUnread} unread</span>
              )}
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="New message"
            >
              <PenSquare size={18} />
            </button>
          </div>

          <ConversationList
            conversations={allConversations}
            activeId={activeConv?.id ?? null}
            onSelect={handleConvSelect}
            loading={loading}
          />
        </div>

        {/* ── Right panel: active thread ─── */}
        <div className={`flex-1 flex flex-col min-h-0 ${
          activeConv ? 'flex' : 'hidden md:flex'
        }`}>
          {activeConv && !activeConv.id.startsWith('lead-') ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setActiveConv(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {activeConv.title ??
                      (activeConv.participants
                        .filter(p => p.user_id !== user?.id)
                        .map(p => p.display_name ?? 'User')
                        .join(', ') || 'Conversation')}
                  </p>
                  {activeConv.type === 'lead_reply' && (
                    <p className="text-xs text-muted-foreground">Lead enquiry thread</p>
                  )}
                </div>
              </div>

              <MessageThread
                conversationId={activeConv.id}
                onMarkRead={() => markRead(activeConv.id)}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare size={40} strokeWidth={1.2} />
              <p className="text-sm">Select a conversation or start a new one</p>
            </div>
          )}
        </div>
      </div>

      {showNew && user && (
        <NewConversationModal
          currentUserId={user.id}
          onClose={() => setShowNew(false)}
          onCreated={(conv) => {
            reload();
            setShowNew(false);
            setActiveConv(conv);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default MessagesPage;
