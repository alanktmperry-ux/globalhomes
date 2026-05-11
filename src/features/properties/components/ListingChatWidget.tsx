import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useTranslation } from '@/shared/lib/i18n';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_USER_MESSAGES = 20;

interface ListingChatWidgetProps {
  listingId: string;
  onContactAgent?: () => void;
}

export function ListingChatWidget({ listingId, onContactAgent }: ListingChatWidgetProps) {
  const { t } = useTranslation();
  const greeting = t('chatWidget.greeting');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: greeting },
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
        (m, i) => !(i === 0 && m.role === 'assistant' && m.content === greeting)
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
      aria-label={t('chatWidget.heading')}
    >
      <header className="px-4 sm:px-5 py-3 border-b border-border bg-secondary/40">
        <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe size={18} className="text-primary" aria-hidden="true" />
          {t('chatWidget.heading')}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('chatWidget.subheading')}
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
              {t('chatWidget.thinking')}
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
              {t('chatWidget.limitReached')}
            </p>
            {onContactAgent && (
              <Button size="sm" onClick={onContactAgent}>
                {t('chatWidget.contactAgent')}
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatWidget.placeholder')}
              disabled={loading}
              maxLength={1000}
              aria-label={t('chatWidget.inputLabel')}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label={t('chatWidget.send')}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </form>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {t('chatWidget.disclaimer')}
        </p>
      </div>
    </section>
  );
}

export default ListingChatWidget;
