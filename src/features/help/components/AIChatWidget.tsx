import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Bot, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import ReactMarkdown from 'react-markdown';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_BPW9omcmNwRZnH6blNp9Sw_lk7f4F_D';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const HIDDEN_PATHS = ['/help', '/property/', '/agent/', '/auth', '/admin'];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { pathname } = useLocation();
  const { isAgent, userRole } = useAuth();
  const userType: 'agent' | 'buyer' =
    isAgent || userRole === 'agent' || userRole === 'admin' ? 'agent' : 'buyer';

  const greeting =
    userType === 'agent'
      ? "Hi! I'm your ListHQ assistant. Ask me anything about listings, auctions, CRM, billing, and more."
      : "Hi! I'm the ListHQ property assistant. Ask me about properties and buying in Australia. 你好！我可以用中文回答。Xin chào!";

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [open, greeting, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? PUBLISHABLE_KEY}`,
          apikey: PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: newMessages, userType }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Something went wrong' }));
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: err.error || 'Something went wrong. Please try again.' },
        ]);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let done = false;

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: accumulated },
              ]);
            } else if (parsed.error) {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: parsed.error },
              ]);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: unknown) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, userType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([{ role: 'assistant', content: greeting }]);
    setInput('');
    setStreaming(false);
  };

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label="Chat with AI assistant"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {userType === 'agent' ? 'ListHQ Assistant' : 'Property Assistant'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="opacity-70 hover:opacity-100 p-1"
                aria-label="Reset chat"
                title="New chat"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="opacity-70 hover:opacity-100 p-1"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content === '' && streaming ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" />
                      Thinking…
                    </span>
                  ) : msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2 bg-background">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder={
                  userType === 'agent'
                    ? 'Ask about listings, auctions, CRM…'
                    : 'Ask about properties, buying process…'
                }
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-h-[36px]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Powered by Claude AI ·{' '}
              <a href="mailto:support@listhq.com.au" className="hover:underline">
                support@listhq.com.au
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default AIChatWidget;
