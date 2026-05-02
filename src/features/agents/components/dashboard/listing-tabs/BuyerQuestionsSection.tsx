import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, MessagesSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  created_at: string;
  messages: ChatMsg[];
}

interface Props {
  listingId: string;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
};

const BuyerQuestionsSection = ({ listingId }: Props) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('listing_chat_sessions')
        .select('id, created_at, messages')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        console.error('Failed to load chat sessions', error);
        setSessions([]);
      } else {
        setSessions(
          (data || []).map((s: any) => ({
            id: s.id,
            created_at: s.created_at,
            messages: Array.isArray(s.messages) ? s.messages : [],
          }))
        );
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <header className="flex items-center gap-2 mb-3">
        <MessagesSquare size={18} className="text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">
          Buyer Questions
        </h3>
        <span className="text-xs text-muted-foreground">
          AI chatbot transcripts
        </span>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No buyer questions yet. When buyers ask the chatbot about this listing, transcripts appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const firstQ = s.messages.find((m) => m.role === 'user')?.content || '(no question)';
            const isOpen = !!expanded[s.id];
            return (
              <li key={s.id} className="py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full text-left flex items-start gap-2 hover:bg-secondary/40 rounded-lg p-2 -m-2 transition-colors"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{fmtDate(s.created_at)}</span>
                      <span>{s.messages.length} message{s.messages.length === 1 ? '' : 's'}</span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5 line-clamp-2">
                      {firstQ}
                    </p>
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-3 ml-6 space-y-2">
                    {s.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`text-sm rounded-lg px-3 py-2 whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-primary/10 text-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground block mb-0.5">
                          {m.role === 'user' ? 'Buyer' : 'Assistant'}
                        </span>
                        {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default BuyerQuestionsSection;
