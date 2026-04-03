import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Search, Loader2 } from 'lucide-react';
import { Conversation } from '../hooks/useConversations';

interface Props {
  currentUserId: string;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

export function NewConversationModal({ currentUserId, onClose, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);

    // Search agents and profiles
    const { data: agents } = await supabase
      .from('agents')
      .select('user_id, name, avatar_url, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .neq('user_id', currentUserId)
      .limit(10);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .neq('user_id', currentUserId)
      .limit(10);

    // Merge, deduplicate by user_id
    const seen = new Set<string>();
    const merged: any[] = [];

    (agents ?? []).forEach(a => {
      if (!seen.has(a.user_id)) {
        seen.add(a.user_id);
        merged.push({ user_id: a.user_id, display_name: a.name, avatar_url: a.avatar_url, email: a.email });
      }
    });

    (profiles ?? []).forEach(p => {
      if (!seen.has(p.user_id)) {
        seen.add(p.user_id);
        merged.push({ user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url, email: null });
      }
    });

    setResults(merged);
    setSearching(false);
  };

  const startConversation = async (recipientUserId: string, recipientName: string) => {
    setCreating(true);

    // Check if a direct conversation already exists between these two users
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    const myConvIds = myParticipations?.map(r => r.conversation_id) ?? [];

    if (myConvIds.length > 0) {
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', recipientUserId)
        .in('conversation_id', myConvIds);

      if (shared && shared.length > 0) {
        // Check if any is a direct conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .in('id', shared.map(s => s.conversation_id))
          .eq('type', 'direct')
          .limit(1)
          .maybeSingle();

        if (existingConv) {
          setCreating(false);
          onCreated({
            ...existingConv,
            unread_count: 0,
            participants: [],
            type: existingConv.type ?? 'direct',
          } as any);
          return;
        }
      }
    }

    // Create new direct conversation
    const p1 = currentUserId < recipientUserId ? currentUserId : recipientUserId;
    const p2 = currentUserId < recipientUserId ? recipientUserId : currentUserId;

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        title: recipientName,
        participant_1: p1,
        participant_2: p2,
      } as any)
      .select()
      .single();

    if (error || !conv) { setCreating(false); return; }

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: recipientUserId },
    ] as any);

    setCreating(false);
    onCreated({
      ...conv,
      unread_count: 0,
      participants: [],
      type: 'direct',
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">New Message</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 relative">
          <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-7 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {results.map(u => (
            <button
              key={u.user_id}
              onClick={() => startConversation(u.user_id, u.display_name ?? u.email ?? 'User')}
              disabled={creating}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {(u.display_name ?? u.email ?? '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.display_name ?? '—'}</p>
                {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
              </div>
            </button>
          ))}
          {query.length >= 2 && results.length === 0 && !searching && (
            <p className="text-center text-sm text-muted-foreground py-6">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
