import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Loader2, Send, HelpCircle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';


const HELP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-help`;

const QUICK_QUESTIONS = [
  'How do I create a new listing?',
  'How do I schedule an open home?',
  'How does the CRM work?',
  'How do I set up an auction?',
  'How do I add a co-agent?',
  'How do I create a CMA report?',
  'How do agent reviews work?',
  'How do I manage my billing?',
  'How do off-market listings work?',
  'How do I share documents with buyers?',
  'How does the vendor report work?',
  'How do I record a trust receipt?',
];

const HelpPage = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;

    // Cancel any in-flight request
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
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

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
        setAnswer('Something went wrong. Please try again or email support@listhq.com.au.');
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Auto-ask after 1s pause
  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length > 5) {
      debounceRef.current = setTimeout(() => askQuestion(value), 1000);
    }
  }, [askQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      askQuestion(query);
    }
  };

  const handleChipClick = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    askQuestion(q);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask anything about ListHQ — powered by AI
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything — e.g. how do I add a co-agent?"
          className="pl-10 pr-12 h-12 text-sm"
        />
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            askQuestion(query);
          }}
          disabled={!query.trim() || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>

      {/* Answer panel */}
      {hasAsked && (
        <Card className="border-primary/20">
          <CardContent className="pt-5">
            {loading && !answer && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking…</span>
              </div>
            )}
            {answer && (
              <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-3">
                  <Sparkles size={12} />
                  AI Answer
                </div>
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick question chips */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <HelpCircle size={12} />
          Common questions
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleChipClick(q)}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Can't find what you need?{' '}
        <a href="mailto:support@listhq.com.au" className="text-primary hover:underline">
          Email support@listhq.com.au
        </a>
      </p>
    </div>
  );
};

export default HelpPage;
