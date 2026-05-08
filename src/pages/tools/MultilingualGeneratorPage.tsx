import { useEffect, useState } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TranslationMap = Record<string, { title?: string; description?: string }>;

const LANGS: { key: string; flag: string; label: string; rtl?: boolean }[] = [
  { key: 'zh_simplified', flag: '🇨🇳', label: '普通话' },
  { key: 'zh_traditional', flag: '🇭🇰', label: '廣東話' },
  { key: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { key: 'ko', flag: '🇰🇷', label: '한국어' },
  { key: 'ar', flag: '🇸🇦', label: 'العربية', rtl: true },
  { key: 'ja', flag: '🇯🇵', label: '日本語' },
  { key: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { key: 'bn', flag: '🇧🇩', label: 'বাংলা' },
  { key: 'tl', flag: '🇵🇭', label: 'Filipino' },
  { key: 'id', flag: '🇮🇩', label: 'Bahasa' },
];

const LOADING_MESSAGES = [
  'Translating into Mandarin...',
  'Translating into Vietnamese...',
  'Translating into Korean...',
  'Translating into Arabic...',
  'Translating into Japanese...',
  'Almost done...',
];

export default function MultilingualGeneratorPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TranslationMap | null>(null);
  const [activeTab, setActiveTab] = useState<string>('zh_simplified');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIdx(0);
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(id);
  }, [loading]);

  const handleGenerate = async () => {
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-listing-preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.translations) {
        throw new Error(data?.error || 'Translation failed');
      }
      setResults(data.translations as TranslationMap);
      const first = LANGS.find((l) => data.translations[l.key]);
      if (first) setActiveTab(first.key);
    } catch (e) {
      setError('Translation failed. Please check your description and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (key: string) => {
    if (!results?.[key]) return;
    const text = `${results[key].title || ''}\n\n${results[key].description || ''}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const availableLangs = results ? LANGS.filter((l) => results[l.key]) : [];
  const active = LANGS.find((l) => l.key === activeTab);
  const activeContent = results?.[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="text-center space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Generate your listing in 10 languages — free
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Paste your English listing below. We'll translate it into Mandarin, Vietnamese,
            Korean, Arabic, Japanese and more — instantly.
          </p>
          <p className="text-xs text-muted-foreground">No sign-up required.</p>
        </header>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="ml-title">Property title</Label>
            <Input
              id="ml-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stunning 4-bedroom family home in Glen Waverley"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ml-desc">Property description</Label>
            <Textarea
              id="ml-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste your full listing description here..."
              disabled={loading}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={loading || (!title.trim() && !description.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {LOADING_MESSAGES[loadingMsgIdx]}
              </>
            ) : (
              <>Generate translations →</>
            )}
          </Button>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        {results && availableLangs.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-5 border-b border-border pb-3">
              {availableLangs.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setActiveTab(l.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === l.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-accent'
                  )}
                >
                  <span className="mr-1.5">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>

            {activeContent && (
              <div
                dir={active?.rtl ? 'rtl' : 'ltr'}
                className="space-y-3"
              >
                <h2 className="text-xl font-bold text-foreground">{activeContent.title}</h2>
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {activeContent.description}
                </p>
                <div className={cn('pt-2', active?.rtl ? 'text-left' : 'text-right')}>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(activeTab)}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1.5" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="rounded-xl bg-primary/5 border border-primary p-6 text-center space-y-3 mt-8">
            <p className="font-semibold text-foreground">Want this in your listings automatically?</p>
            <p className="text-sm text-muted-foreground">
              ListHQ agents generate multilingual listings in 60 seconds — directly from their dashboard.
              Reach Mandarin, Vietnamese and Korean buyers without hiring a translator.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/register?role=agent"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Start free trial →
              </a>
              <a
                href="/dashboard/billing"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
              >
                See pricing
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
