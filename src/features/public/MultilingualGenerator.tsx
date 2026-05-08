import { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const LANGS = [
  { key: 'zh_simplified', flag: '🇨🇳', label: 'Chinese (Simplified)' },
  { key: 'zh_traditional', flag: '🇹🇼', label: 'Chinese (Traditional)' },
  { key: 'vi', flag: '🇻🇳', label: 'Vietnamese' },
  { key: 'ko', flag: '🇰🇷', label: 'Korean' },
  { key: 'ar', flag: '🇸🇦', label: 'Arabic' },
  { key: 'ja', flag: '🇯🇵', label: 'Japanese' },
];

type TranslationMap = Record<string, { title?: string; description?: string }>;

export default function MultilingualGenerator() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TranslationMap | null>(null);
  const [error, setError] = useState('');
  const [activeLang, setActiveLang] = useState('zh_simplified');

  const handleTranslate = async () => {
    if (!title.trim() && !description.trim()) {
      setError('Enter a title or description first.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-listing-preview', {
        body: { title, description },
      });
      if (fnError || (data as any)?.error) throw new Error((data as any)?.error || 'Translation failed');
      setResults((data as any).translations);
    } catch (e: any) {
      setError(e.message || 'Translation failed — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles size={12} /> Free tool — no account required
          </div>
          <h1 className="text-4xl font-semibold text-foreground tracking-tight">Multilingual Listing Generator</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Paste any property listing and instantly see it translated into 6 languages — ready to reach Chinese, Vietnamese, Korean, Arabic, and Japanese buyers.
          </p>
        </div>

        {/* Input */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>Listing title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stunning 4BR family home in Glen Waverley"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label>Listing description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste your listing description here…"
              rows={6}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length} / 2000</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleTranslate} disabled={loading} className="w-full gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Translating…</> : <><Sparkles size={14} /> Translate into 6 languages</>}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex gap-1 p-3 border-b border-border flex-wrap">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setActiveLang(l.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeLang === l.key
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-4" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
              {results[activeLang] ? (
                <>
                  {results[activeLang].title && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Title</p>
                      <p className="font-semibold text-foreground text-lg leading-snug">{results[activeLang].title}</p>
                    </div>
                  )}
                  {results[activeLang].description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Description</p>
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{results[activeLang].description}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Translation not available for this language.</p>
              )}
            </div>
            <div className="bg-muted/40 border-t border-border px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground text-sm">Want this on all your listings automatically?</p>
                <p className="text-xs text-muted-foreground mt-0.5">ListHQ translates every listing the moment it goes live. Free for agents.</p>
              </div>
              <Button onClick={() => navigate('/for-agents')} className="gap-2 shrink-0">
                Join ListHQ free <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
