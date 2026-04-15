import { useState } from 'react';
import { Conversation } from '../hooks/useConversations';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
  onArchiveToggle?: (conversationId: string, archived: boolean) => void;
}

export function ConversationList({ conversations, activeId, onSelect, loading, onArchiveToggle }: ConversationListProps) {
  const { user } = useAuth();
  const [view, setView] = useState<'active' | 'archived'>('active');

  const filtered = conversations.filter(c => {
    if (c.id.startsWith('lead-')) return view === 'active'; // pseudo-conversations always in active
    return view === 'active' ? !c.archived : !!c.archived;
  });

  const handleArchive = async (e: React.MouseEvent, conv: Conversation, archive: boolean) => {
    e.stopPropagation();
    if (!user) return;

    await supabase
      .from('conversation_participants')
      .update({ archived: archive } as any)
      .eq('conversation_id', conv.id)
      .eq('user_id', user.id);

    onArchiveToggle?.(conv.id, archive);
    toast.success(archive ? 'Conversation archived' : 'Conversation unarchived');
  };

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Active / Archived toggle */}
      <div className="flex gap-1 px-3 py-2 border-b border-border/50">
        {(['active', 'archived'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
              view === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <MessageSquare size={32} className="text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground/70">
            {view === 'archived' ? 'No archived conversations.' : 'No conversations yet.'}
          </p>
          {view === 'active' && (
            <p className="text-sm text-muted-foreground mt-1">Start a new message or reply to a lead enquiry.</p>
          )}
        </div>
      ) : (
        filtered.map((conv) => {
          const other = conv.participants.find(p => p.user_id !== user?.id);
          const displayName = conv.title ?? other?.display_name ?? 'Unknown';
          const isActive = conv.id === activeId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 border-b border-border/50 relative
                ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
              `}
            >
              {/* Avatar */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {displayName[0]?.toUpperCase() ?? <MessageSquare size={16} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {conv.last_message_text ?? (conv.type === 'lead_reply' ? 'Lead enquiry' : 'Direct message')}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Archive / Unarchive button */}
              {!conv.id.startsWith('lead-') && (
                <button
                  onClick={(e) => handleArchive(e, conv, !conv.archived)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                  title={conv.archived ? 'Unarchive' : 'Archive'}
                >
                  {conv.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
