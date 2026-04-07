import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getFaqMatches } from '@/features/help/utils/faqSearch';


const HELP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-help`;

interface Props {
  className?: string;
  placeholder?: string;
  externalQuery?: string;
  externalQueryToken?: number;
}

export function HelpSearch({ className = '', placeholder, externalQuery, externalQueryToken }: Props) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  const faqMatches = useMemo(() => getFaqMatches(query), [query]);

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setHasAsked(true);
    setAnswer('');

    try {
      const resp = await fetch(HELP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Something went wrong' }));
        setAnswer(err.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let accumulated = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setAnswer(accumulated);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setAnswer(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if (e.name !== 'AbortError') {
        setAnswer('Something went wrong. Please try again or [contact support](/help/contact).');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      abortRef.current?.abort();
      setLoading(false);
      setAnswer('');
      setHasAsked(false);
      return;
    }

    debounceRef.current = setTimeout(() => askQuestion(val), 900);
  }, [askQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      askQuestion(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setAnswer('');
      setHasAsked(false);
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!externalQueryToken || !externalQuery?.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(externalQuery);
    askQuestion(externalQuery);
  }, [askQuestion, externalQuery, externalQueryToken]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search for help — e.g. 'how to list a property', 'auction registration'"}
          className="pl-10 pr-10 h-12 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              abortRef.current?.abort();
              setLoading(false);
              setQuery('');
              setAnswer('');
              setHasAsked(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {(query.trim() || hasAsked) && (
        <div className="mt-3 bg-card border border-border rounded-xl shadow-lg p-4 max-h-[400px] overflow-y-auto">
          {query.trim() && faqMatches.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-primary font-medium mb-2">Matching FAQs</div>
              <div className="space-y-1.5">
                {faqMatches.map((item) => (
                  <Link
                    key={item.id}
                    to={`/help/faq#faq-${item.id}`}
                    className="block rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    {item.question}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading && !answer && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Thinking…</span>
            </div>
          )}

          {answer && (
            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2">
                <Sparkles size={12} />
                AI Answer
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          )}

          {query.trim() && !loading && !answer && faqMatches.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching FAQs found yet. Try a more specific question.</p>
          )}

          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
            Can't find what you need?{' '}
            <a href="/help/contact" className="text-primary hover:underline">Contact support</a>.
          </p>
        </div>
      )}
    </div>
  );
}
