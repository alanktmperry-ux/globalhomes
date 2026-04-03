import { Conversation } from '../hooks/useConversations';
import { useAuth } from '@/features/auth/AuthProvider';
import { MessageSquare, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, loading }: ConversationListProps) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <MessageSquare size={32} className="text-muted-foreground/40 mb-3" />
        <p className="font-medium text-foreground/70">No conversations yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Start a new message or reply to a lead enquiry.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((conv) => {
        const other = conv.participants.find(p => p.user_id !== user?.id);
        const displayName = conv.title ?? other?.display_name ?? 'Unknown';
        const isActive = conv.id === activeId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 border-b border-border/50
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
          </button>
        );
      })}
    </div>
  );
}
