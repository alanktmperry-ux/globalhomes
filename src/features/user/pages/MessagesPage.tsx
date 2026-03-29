import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MessageCircle, ArrowLeft, Send, User, Building2, PenSquare,
  Archive, Trash2, MoreVertical, ArchiveRestore, Search,
  CheckCircle2, Mail, MailOpen, ChevronDown, X, Check
} from 'lucide-react';
import { NewMessageDialog } from '@/features/user/components/NewMessageDialog';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { useI18n } from '@/shared/lib/i18n';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  // Lead-specific fields
  lead_id?: string;
  lead_read?: boolean;
  lead_status?: string;
  lead_score?: number;
  lead_suburb?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

type FilterTab = 'all' | 'unread' | 'archived';
type SortBy = 'newest' | 'oldest' | 'score';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // New state for management features
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Swipe state
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const getConversationKey = (otherUserId: string, propertyId: string | null) => {
    if (!otherUserId) return null;
    return `${otherUserId}:${propertyId || 'none'}`;
  };

  // Fetch legacy leads as pseudo-conversations for agents/buyers
  const fetchLegacyLeads = useCallback(async (): Promise<Conversation[]> => {
    if (!user) return [];

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
        .limit(100);

      if (!leads || leads.length === 0) return [];

      return leads.map((l: any) => {
        const searchCtx = l.search_context as any;
        const parsedQuery = searchCtx?.parsed_query;
        return {
          id: `lead-${l.id}`,
          lead_id: l.id,
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
          unread_count: l.read ? 0 : 1,
          lead_read: l.read ?? false,
          lead_status: l.status || 'new',
          lead_score: l.score,
          lead_suburb: parsedQuery?.location || null,
        };
      });
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
      lead_id: l.id,
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
      lead_read: true,
      lead_status: l.status || 'new',
      lead_score: l.score,
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

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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
          archived_by: c.archived_by || [],
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

  // Realtime for new conversations & leads
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => fetchConversations())
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
      const unreadIds = data
        .filter((m: any) => !m.is_read && m.sender_id !== user?.id)
        .map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      }
    }
  }, [selectedConvo, user]);

  useEffect(() => {
    if (selectedConvo && !selectedConvo.id.startsWith('lead-')) {
      fetchMessages();
    }
  }, [fetchMessages, selectedConvo]);

  // Realtime for new messages
  useEffect(() => {
    if (!selectedConvo || selectedConvo.id.startsWith('lead-')) return;
    const channel = supabase
      .channel(`messages-${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.sender_id !== user?.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedConvo || sending) return;

    let convoId = selectedConvo.id;

    if (convoId.startsWith('lead-')) {
      if (!selectedConvo.other_user_id) return;

      const participant_1 = user.id < selectedConvo.other_user_id ? user.id : selectedConvo.other_user_id;
      const participant_2 = user.id < selectedConvo.other_user_id ? selectedConvo.other_user_id : user.id;

      const { data: newConvo, error } = await supabase
        .from('conversations')
        .upsert(
          { participant_1, participant_2, property_id: selectedConvo.property_id },
          { onConflict: 'participant_1,participant_2,property_id' }
        )
        .select('id')
        .single();

      if (error || !newConvo) return;
      convoId = newConvo.id;
      setSelectedConvo(prev => prev ? { ...prev, id: convoId, participant_1, participant_2 } : null);
    }

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error: sendError } = await supabase.from('messages').insert({
        conversation_id: convoId, sender_id: user.id, content,
      });

      if (sendError) {
        setNewMessage(content);
        return;
      }

      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convoId);

      if (selectedConvo.other_user_id) {
        supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'new_message',
            title: `New message from ${user.email || 'a user'}`,
            message: content.length > 200 ? content.slice(0, 200) + '…' : content,
            recipient_user_id: selectedConvo.other_user_id,
            property_id: selectedConvo.property_id || undefined,
          },
        }).catch(() => {});
      }
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

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a');
    return format(d, 'MMM d, h:mm a');
  };

  const isLegacyReadOnly = Boolean(selectedConvo?.id.startsWith('lead-') && !selectedConvo?.other_user_id);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId && !showSortMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId, showSortMenu]);

  // Scroll input into view for iOS keyboard
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleFocus = () => {
      setTimeout(() => { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    };
    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, [inputRef]);

  // ─── Lead-specific actions ───

  const markLeadRead = async (leadId: string) => {
    await supabase.from('leads').update({ read: true } as any).eq('id', leadId);
    setConversations(prev => prev.map(c =>
      c.lead_id === leadId ? { ...c, lead_read: true, unread_count: 0 } : c
    ));
  };

  const handleOpenConvo = async (c: Conversation) => {
    // Mark as read on open for leads
    if (c.lead_id && !c.lead_read) {
      markLeadRead(c.lead_id);
    }
    setSelectedConvo(c);
  };

  const isArchivedByMe = (c: Conversation) => {
    if (c.lead_status === 'archived') return true;
    return ((c as any).archived_by || []).includes(user?.id);
  };

  const isUnread = (c: Conversation) => {
    if (c.lead_id) return !c.lead_read;
    return c.unread_count > 0;
  };

  // ─── Bulk actions ───

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const getLeadIdsFromSelection = () => {
    return [...selectedIds]
      .filter(id => id.startsWith('lead-'))
      .map(id => id.replace('lead-', ''));
  };

  const getConvoIdsFromSelection = () => {
    return [...selectedIds].filter(id => !id.startsWith('lead-'));
  };

  const bulkDelete = async () => {
    const leadIds = getLeadIdsFromSelection();
    const convoIds = getConvoIdsFromSelection();

    if (leadIds.length) await supabase.from('leads').delete().in('id', leadIds);
    if (convoIds.length) await supabase.from('conversations').delete().in('id', convoIds);

    setConversations(prev => prev.filter(c => !selectedIds.has(c.id)));
    toast.success(`Deleted ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}`);
    exitSelectionMode();
  };

  const bulkArchive = async () => {
    const leadIds = getLeadIdsFromSelection();
    const convoIds = getConvoIdsFromSelection();

    if (leadIds.length) {
      await supabase.from('leads').update({ status: 'archived', archived_at: new Date().toISOString() } as any).in('id', leadIds);
    }
    if (convoIds.length && user) {
      for (const cid of convoIds) {
        const convo = conversations.find(c => c.id === cid);
        if (convo) {
          await supabase.from('conversations')
            .update({ archived_by: [...((convo as any).archived_by || []), user.id] } as any)
            .eq('id', cid);
        }
      }
    }
    setConversations(prev => prev.map(c => {
      if (!selectedIds.has(c.id)) return c;
      if (c.lead_id) return { ...c, lead_status: 'archived' };
      return { ...c, archived_by: [...((c as any).archived_by || []), user!.id] } as any;
    }));
    toast.success(`Archived ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}`);
    exitSelectionMode();
  };

  const bulkMarkRead = async () => {
    const leadIds = getLeadIdsFromSelection();
    if (leadIds.length) {
      await supabase.from('leads').update({ read: true } as any).in('id', leadIds);
    }
    // For real convos, mark messages as read
    const convoIds = getConvoIdsFromSelection();
    if (convoIds.length && user) {
      await supabase.from('messages').update({ is_read: true }).in('conversation_id', convoIds).neq('sender_id', user.id);
    }

    setConversations(prev => prev.map(c => {
      if (!selectedIds.has(c.id)) return c;
      return { ...c, lead_read: true, unread_count: 0 };
    }));
    toast.success('Marked as read');
    exitSelectionMode();
  };

  const bulkMarkUnread = async () => {
    const leadIds = getLeadIdsFromSelection();
    if (leadIds.length) {
      await supabase.from('leads').update({ read: false } as any).in('id', leadIds);
    }
    setConversations(prev => prev.map(c => {
      if (!selectedIds.has(c.id)) return c;
      return { ...c, lead_read: false, unread_count: 1 };
    }));
    toast.success('Marked as unread');
    exitSelectionMode();
  };

  // ─── Single-item actions ───

  const handleArchive = async (c: Conversation) => {
    setOpenMenuId(null);
    setSwipedId(null);
    if (c.lead_id) {
      await supabase.from('leads').update({ status: 'archived', archived_at: new Date().toISOString() } as any).eq('id', c.lead_id);
      setConversations(prev => prev.map(item => item.id === c.id ? { ...item, lead_status: 'archived' } : item));
    } else if (user) {
      await supabase.from('conversations')
        .update({ archived_by: [...((c as any).archived_by || []), user.id] } as any)
        .eq('id', c.id);
      setConversations(prev => prev.map(item =>
        item.id === c.id ? { ...item, archived_by: [...((item as any).archived_by || []), user!.id] } as any : item
      ));
    }
    toast.success('Archived');
  };

  const handleUnarchive = async (c: Conversation) => {
    setOpenMenuId(null);
    if (c.lead_id) {
      await supabase.from('leads').update({ status: 'new', archived_at: null } as any).eq('id', c.lead_id);
      setConversations(prev => prev.map(item => item.id === c.id ? { ...item, lead_status: 'new' } : item));
    } else if (user) {
      const currentArchived: string[] = (c as any).archived_by || [];
      await supabase.from('conversations')
        .update({ archived_by: currentArchived.filter((id: string) => id !== user.id) } as any)
        .eq('id', c.id);
      setConversations(prev => prev.map(item =>
        item.id === c.id ? { ...item, archived_by: currentArchived.filter((id: string) => id !== user!.id) } as any : item
      ));
    }
    toast.success('Unarchived');
  };

  const handleDeleteSingle = async (c: Conversation) => {
    setOpenMenuId(null);
    setSwipedId(null);
    if (c.lead_id) {
      await supabase.from('leads').delete().eq('id', c.lead_id);
    } else {
      await supabase.from('conversations').delete().eq('id', c.id);
    }
    setConversations(prev => prev.filter(item => item.id !== c.id));
    if (selectedConvo?.id === c.id) {
      setSelectedConvo(null);
      setMessages([]);
    }
    toast.success('Deleted');
  };

  // ─── Swipe handling ───

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (c: Conversation) => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 60) {
      // Swipe left → show actions
      setSwipedId(c.id);
    } else if (diff < -60) {
      // Swipe right → mark as read
      if (c.lead_id && !c.lead_read) {
        markLeadRead(c.lead_id);
        toast.success('Marked as read');
      }
      setSwipedId(null);
    } else {
      if (swipedId === c.id) setSwipedId(null);
    }
  };

  // ─── Filtering & Sorting ───

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        if (activeTab === 'unread') return isUnread(c) && !isArchivedByMe(c);
        if (activeTab === 'archived') return isArchivedByMe(c);
        return !isArchivedByMe(c); // all = non-archived
      })
      .filter(c => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return (
          (c.last_message_text || '').toLowerCase().includes(q) ||
          (c.other_user_name || '').toLowerCase().includes(q) ||
          (c.property_title || '').toLowerCase().includes(q) ||
          (c.lead_suburb || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime();
        if (sortBy === 'score') return (b.lead_score ?? 0) - (a.lead_score ?? 0);
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
  }, [conversations, activeTab, searchText, sortBy]);

  // Unread count for badge
  const unreadCount = useMemo(() => {
    return conversations.filter(c => isUnread(c) && !isArchivedByMe(c)).length;
  }, [conversations]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'archived', label: 'Archived' },
  ];

  const sortLabels: Record<SortBy, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    score: 'Highest score',
  };

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
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {selectedConvo ? (
            <button onClick={() => { setSelectedConvo(null); setMessages([]); fetchConversations(); }} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <h1 className="font-display text-xl font-bold text-foreground truncate">
            {selectedConvo ? selectedConvo.other_user_name : t('nav.messages')}
          </h1>
          {!selectedConvo && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  showSearch ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <Search size={16} />
              </button>
              <button
                onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  selectionMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {selectionMode ? <X size={16} /> : <CheckCircle2 size={16} />}
              </button>
              {!selectionMode && (
                <button
                  onClick={() => setNewMsgDialogOpen(true)}
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <PenSquare size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && !selectedConvo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="max-w-lg mx-auto px-4 pb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-secondary rounded-xl border-none outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter tabs + sort */}
        {!selectedConvo && (
          <div className="max-w-lg mx-auto px-4 pb-2 flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); exitSelectionMode(); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg bg-secondary"
              >
                {sortLabels[sortBy]}
                <ChevronDown size={12} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                  {(Object.keys(sortLabels) as SortBy[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors ${
                        sortBy === key ? 'text-primary font-medium' : 'text-foreground'
                      }`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              className="flex-1 flex flex-col overflow-hidden"
            >
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

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-4" style={{ maxHeight: 'calc(100vh - 240px)' }}>
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
                    {selectedConvo.lead_score != null && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          selectedConvo.lead_score >= 70 ? 'bg-destructive/10 text-destructive' :
                          selectedConvo.lead_score >= 40 ? 'bg-amber-500/10 text-amber-600' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          Score: {selectedConvo.lead_score}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                          isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-foreground rounded-bl-md'
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
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {activeTab === 'archived' ? (
                    <>
                      <Archive size={40} strokeWidth={1.2} className="mb-3" />
                      <p className="text-sm font-medium">Nothing archived yet</p>
                      <p className="text-xs mt-1">Archived messages will appear here</p>
                    </>
                  ) : activeTab === 'unread' ? (
                    <>
                      <CheckCircle2 size={40} strokeWidth={1.2} className="mb-3 text-primary" />
                      <p className="text-sm font-medium">You're all caught up!</p>
                      <p className="text-xs mt-1">No unread messages</p>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs mt-1">Leads will appear here when buyers search in your area</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  {filteredConversations.map(c => (
                    <div key={c.id} className="relative group overflow-hidden rounded-2xl">
                      {/* Swipe action buttons behind */}
                      <AnimatePresence>
                        {swipedId === c.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-y-0 right-0 flex items-stretch z-10"
                          >
                            <button
                              onClick={() => handleArchive(c)}
                              className="w-16 flex items-center justify-center bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30 transition-colors"
                            >
                              <Archive size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(c)}
                              className="w-16 flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div
                        className={`relative flex items-start gap-3 px-4 py-3 rounded-2xl transition-all ${
                          isUnread(c) ? 'bg-primary/5' : 'hover:bg-secondary/70'
                        } ${swipedId === c.id ? '-translate-x-32' : 'translate-x-0'}`}
                        style={{ transition: 'transform 0.2s ease-out' }}
                        onTouchStart={(e) => handleTouchStart(c.id, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(c)}
                        onClick={() => {
                          if (selectionMode) { toggleSelect(c.id); return; }
                          if (swipedId === c.id) { setSwipedId(null); return; }
                          handleOpenConvo(c);
                        }}
                      >
                        {/* Checkbox in selection mode */}
                        {selectionMode && (
                          <div className="flex items-center justify-center shrink-0 mt-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedIds.has(c.id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                            }`}>
                              {selectedIds.has(c.id) && <Check size={12} className="text-primary-foreground" />}
                            </div>
                          </div>
                        )}

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                          {c.other_user_avatar ? (
                            <img src={c.other_user_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-foreground">
                              {c.other_user_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${isUnread(c) ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                              {c.other_user_name}
                            </span>
                            {isUnread(c) && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                            {c.lead_score != null && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                c.lead_score >= 70 ? 'bg-destructive/10 text-destructive' :
                                c.lead_score >= 40 ? 'bg-amber-500/10 text-amber-600' :
                                'bg-blue-500/10 text-blue-600'
                              }`}>
                                {c.lead_score}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-muted-foreground shrink-0 pr-6">
                              {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                            </span>
                          </div>
                          {c.property_title && (
                            <p className="text-xs text-muted-foreground truncate">{c.property_title}</p>
                          )}
                          <p className={`text-xs truncate mt-0.5 ${isUnread(c) ? 'text-foreground/70' : 'text-muted-foreground/70'}`}>
                            {c.last_message_text || 'No messages yet'}
                          </p>
                        </div>

                        {/* Action menu trigger */}
                        {!selectionMode && (
                          <div className="absolute top-3 right-3" ref={openMenuId === c.id ? menuRef : undefined}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                            >
                              <MoreVertical size={14} />
                            </button>

                            <AnimatePresence>
                              {openMenuId === c.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-8 z-50 w-44 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
                                >
                                  {isUnread(c) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        if (c.lead_id) markLeadRead(c.lead_id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <MailOpen size={13} /> Mark as read
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        if (c.lead_id) {
                                          supabase.from('leads').update({ read: false } as any).eq('id', c.lead_id);
                                          setConversations(prev => prev.map(item =>
                                            item.id === c.id ? { ...item, lead_read: false, unread_count: 1 } : item
                                          ));
                                        }
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <Mail size={13} /> Mark as unread
                                    </button>
                                  )}
                                  {isArchivedByMe(c) ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleUnarchive(c); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <ArchiveRestore size={13} /> Unarchive
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleArchive(c); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <Archive size={13} /> Archive
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSingle(c); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectionMode && !selectedConvo && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-16 inset-x-0 z-30 safe-area-bottom"
          >
            <div className="max-w-lg mx-auto px-4 pb-2">
              <div className="bg-card border border-border rounded-2xl shadow-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-primary"
                  >
                    {selectedIds.size === filteredConversations.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={bulkMarkRead}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
                  >
                    <MailOpen size={14} /> Read
                  </button>
                  <button
                    onClick={bulkMarkUnread}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
                  >
                    <Mail size={14} /> Unread
                  </button>
                  <button
                    onClick={bulkArchive}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
                  >
                    <Archive size={14} /> Archive
                  </button>
                  <button
                    onClick={bulkDelete}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NewMessageDialog
        open={newMsgDialogOpen}
        onOpenChange={setNewMsgDialogOpen}
        userId={user.id}
        onConversationCreated={(convo) => {
          const fullConvo: Conversation = {
            id: convo.id,
            participant_1: user.id < convo.other_user_id ? user.id : convo.other_user_id,
            participant_2: user.id < convo.other_user_id ? convo.other_user_id : user.id,
            property_id: convo.property_id,
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            other_user_name: convo.other_user_name,
            other_user_avatar: convo.other_user_avatar,
            other_user_id: convo.other_user_id,
            property_title: convo.property_title,
            property_address: convo.property_address,
            property_image: convo.property_image,
            last_message_text: undefined,
            unread_count: 0,
          };
          setSelectedConvo(fullConvo);
          setMessages([]);
        }}
      />

      <BottomNav />
    </div>
  );
};

export default MessagesPage;
