import { useEffect, useRef, useState } from 'react';
import { useMessages, type ChatMessage } from '../hooks/useMessages';
import { useAuth } from '@/features/auth/AuthProvider';
import { useViewerLocale } from '@/features/auth/hooks/useViewerLocale';
import { Send, Loader2 } from 'lucide-react';
import { BuyerVerifiedBadgeInline } from '@/components/preapproval/BuyerVerifiedBadgeInline';
import { formatDistanceToNow } from 'date-fns';

interface MessageThreadProps {
  conversationId: string;
  onMarkRead?: () => void;
}

const RTL_LANGS = ['ar', 'fa', 'ur', 'he'];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', zh: 'Chinese', 'zh-CN': 'Chinese', 'zh-TW': 'Chinese (Traditional)',
  yue: 'Cantonese', vi: 'Vietnamese', ko: 'Korean', ar: 'Arabic',
  hi: 'Hindi', ja: 'Japanese', it: 'Italian', de: 'German', es: 'Spanish',
  fr: 'French', pt: 'Portuguese', ru: 'Russian', th: 'Thai', id: 'Indonesian',
  ms: 'Malay', fil: 'Filipino', el: 'Greek', pl: 'Polish', ne: 'Nepali',
  tr: 'Turkish', fa: 'Persian', ur: 'Urdu', he: 'Hebrew', uk: 'Ukrainian',
  my: 'Burmese', km: 'Khmer', bn: 'Bengali', pa: 'Punjabi', ta: 'Tamil',
};

function getLanguageName(code: string | null | undefined): string {
  if (!code) return 'unknown';
  const norm = code.split('-')[0].split('_')[0];
  return LANGUAGE_NAMES[code] || LANGUAGE_NAMES[norm] || code.toUpperCase();
}

function MessageBubble({
  msg,
  isOwn,
  viewerLocale,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  viewerLocale: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  const originalText = msg.original_body || msg.content || '';
  const bodyToRender = showOriginal && msg.isTranslated ? originalText : msg.displayBody;

  const renderedLangRaw = showOriginal
    ? msg.original_lang
    : msg.isTranslated
      ? viewerLocale
      : msg.original_lang;
  const renderedLang = (renderedLangRaw || 'en').split('-')[0].split('_')[0];
  const isRTL = RTL_LANGS.includes(renderedLang);

  const vLoc = (viewerLocale || 'en').split('-')[0].split('_')[0];
  const origLoc = (msg.original_lang || 'en').split('-')[0].split('_')[0];

  const isTranslating =
    !msg.isTranslated &&
    (msg.translation_status === 'pending' || msg.translation_status === 'translating') &&
    origLoc !== vLoc;

  const isFailed = msg.translation_status === 'failed' && !msg.isTranslated && origLoc !== vLoc;

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {msg.sender?.display_name?.[0]?.toUpperCase() ?? '?'}
      </div>
      {!isOwn && msg.sender_id && <BuyerVerifiedBadgeInline buyerUserId={msg.sender_id} />}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          }`}
        >
          {isTranslating && (
            <div className="flex items-center gap-1.5 mb-1 opacity-75">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span className="text-[10px] italic">Translating…</span>
            </div>
          )}
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            lang={renderedLang}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
            className="whitespace-pre-wrap break-words"
          >
            {bodyToRender}
          </div>
        </div>

        {msg.isTranslated && !isFailed && (
          <div className="text-[10px] text-muted-foreground mt-0.5 px-1 flex items-center gap-1 flex-wrap">
            <span aria-hidden>🌐</span>
            <span>Translated from {getLanguageName(msg.translationSource)}</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginal((p) => !p);
              }}
              className="underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-sm"
            >
              {showOriginal ? 'View translation' : 'View original'}
            </button>
          </div>
        )}

        {isFailed && (
          <span className="text-[10px] italic text-muted-foreground mt-0.5 px-1">
            Translation unavailable · showing original
          </span>
        )}

        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export function MessageThread({ conversationId, onMarkRead }: MessageThreadProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const viewerLocale = useViewerLocale();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const composerLang = (viewerLocale || 'en').split('-')[0].split('_')[0];
  const composerDir: 'rtl' | 'ltr' = RTL_LANGS.includes(composerLang) ? 'rtl' : 'ltr';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    onMarkRead?.();
  }, [conversationId]);

  const handleSend = async () => {
    if (!draft.trim() || !user) return;
    setSending(true);
    await sendMessage(draft, user.id);
    setDraft('');
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No messages yet. Send the first one below.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.sender_id === user?.id}
            viewerLocale={viewerLocale}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            dir={composerDir}
            lang={composerLang}
            className="flex-1 resize-none rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground max-h-32 overflow-y-auto"
            style={{ minHeight: '42px', textAlign: composerDir === 'rtl' ? 'right' : 'left' }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
