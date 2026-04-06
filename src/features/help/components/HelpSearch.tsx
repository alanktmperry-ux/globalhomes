import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';


const HELP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-help`;

interface Props {
  className?: string;
  placeholder?: string;
}

export function HelpSearch({ className = '', placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;

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
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setAnswer('Something went wrong. Please try again or [contact support](/help/contact).');
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length > 5) {
      debounceRef.current = setTimeout(() => askQuestion(val), 900);
    }
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
            onClick={() => { setQuery(''); setAnswer(''); setHasAsked(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {hasAsked && (
        <div className="mt-3 bg-card border border-border rounded-xl shadow-lg p-4 max-h-[400px] overflow-y-auto">
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
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
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
