import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const OPENING_MESSAGE =
  'Hi! Ask me anything about this property — I can reply in your language. 你好！Xin chào！';
const MAX_USER_MESSAGES = 20;

interface ListingChatWidgetProps {
  listingId: string;
  onContactAgent?: () => void;
}

export function ListingChatWidget({ listingId, onContactAgent }: ListingChatWidgetProps) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || limitReached) return;

    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Strip the opening assistant greeting before sending — it's UI-only
      const toSend = next.filter(
        (m, i) => !(i === 0 && m.role === 'assistant' && m.content === OPENING_MESSAGE)
      );

      const { data, error: fnErr } = await supabase.functions.invoke('listing-chat', {
        body: { listing_id: listingId, messages: toSend, session_id: sessionId },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      const reply: string = data?.reply ?? '';
      if (data?.session_id) setSessionId(data.session_id);

      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg || 'Something went wrong. Please try again.');
      // Roll back the user message so they can retry
      setMessages(messages);
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
      aria-label="Ask about this property"
    >
      <header className="px-4 sm:px-5 py-3 border-b border-border bg-secondary/40">
        <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe size={18} className="text-primary" aria-hidden="true" />
          Ask about this property
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask in any language — English, 中文, Tiếng Việt, हिन्दी and more
        </p>
      </header>

      <div
        ref={scrollRef}
        className="px-4 sm:px-5 py-4 space-y-3 overflow-y-auto"
        style={{ maxHeight: 400, minHeight: 200 }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-muted-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive text-center" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-border bg-background">
        {limitReached ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              To continue, please contact the agent directly.
            </p>
            {onContactAgent && (
              <Button size="sm" onClick={onContactAgent}>
                Contact agent
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question in any language…"
              disabled={loading}
              maxLength={1000}
              aria-label="Your question"
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </form>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Answers are AI-generated from the listing data. Always confirm details with the agent.
        </p>
      </div>
    </section>
  );
}

export default ListingChatWidget;
