import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PropertyCard } from '@/components/PropertyCard';
import { mapDbProperty } from '@/features/properties/api/fetchPublicProperties';
import { Property } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { translateSearchQuery } from '@/features/properties/lib/translationService';
import { parsePropertyQuery, filtersToChips, type ParsedFilters } from '@/features/search/lib/parsePropertyQuery';
import { SlidersHorizontal } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'Quiet family home near good schools',
  'Modern apartment close to cafes and transport',
  'Spacious house with a backyard under $900k',
];

function getSessionId(): string {
  const key = 'ai-search-session';
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(key, sid);
  }
  return sid;
}

interface AIIntent {
  suburbs: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  property_types: string[];
  intent_summary: string;
}

interface AIPropertySearchProps {
  /** When provided, shows a "Refine in filters" button that hands the parsed
   *  query off to the parent's filter UI. */
  onRefineWithFilters?: (parsed: ParsedFilters) => void;
}

export function AIPropertySearch({ onRefineWithFilters }: AIPropertySearchProps = {}) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth() ?? { user: null } as any;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [intent, setIntent] = useState<AIIntent | null>(null);
  const [parsed, setParsed] = useState<ParsedFilters | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setProperties(null);
    // Parse client-side immediately so chips can render even before AI returns
    setParsed(parsePropertyQuery(q));
    try {
      // If the buyer is searching in a non-English language, translate the
      // natural-language query to English first so the AI search edge function
      // (which expects English suburb/property-type extraction) gets clean input.
      let searchQuery = q;
      if (language !== 'en') {
        try {
          const { englishQuery } = await translateSearchQuery(q);
          if (englishQuery && englishQuery.trim()) searchQuery = englishQuery;
          console.log('[AIPropertySearch] translated query:', { original: q, english: searchQuery, language });
        } catch (translateErr) {
          // Non-fatal: fall back to original query
          console.warn('[AIPropertySearch] query translation failed, using original:', translateErr);
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-property-search', {
        body: {
          query: searchQuery,
          session_id: getSessionId(),
          buyer_id: user?.id ?? undefined,
        },
      });
      if (error) {
        // FunctionsHttpError exposes context.status / context.json
        const status = (error as any)?.context?.status;
        if (status === 429) {
          toast.error(t('Too many requests. Please wait a moment.'));
          return;
        }
        if (status === 402) {
          toast.error(t('AI credits exhausted. Please contact support.'));
          return;
        }
        let detail = error.message || 'Edge function error';
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      console.log('[AIPropertySearch] raw response:', { hasProperties: Array.isArray(data?.properties), count: data?.properties?.length, firstId: data?.properties?.[0]?.id, intent: data?.intent });
      const mapped: Property[] = (data?.properties ?? []).map((p: any) => mapDbProperty(p));
      console.log('[AIPropertySearch] mapped count:', mapped.length, 'first:', mapped[0] ? { id: mapped[0].id, suburb: mapped[0].suburb, beds: mapped[0].beds } : null);
      setProperties(mapped);
      setIntent(data?.intent ?? null);
    } catch (e: any) {
      console.error('AI property search failed:', e);
      const msg = e?.message ? `${t('Search failed')}: ${e.message}` : t('Search failed. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, t, language]);

  const handleSelect = useCallback((p: Property) => navigate(`/property/${p.id}`), [navigate]);
  const handleToggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="relative">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(query); }}
            placeholder={t('Describe your ideal home — suburb, bedrooms, lifestyle, budget...')}
            className="h-14 pl-12 pr-20 text-base"
            disabled={loading}
          />
          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 text-primary hover:bg-primary/15 border-0 text-[10px] font-bold tracking-wide">
            AI
          </Badge>
        </div>
        <Button
          onClick={() => runSearch(query)}
          disabled={loading || !query.trim()}
          className="mt-3 w-full sm:w-auto"
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t('Find My Home')}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <span className="inline-flex gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span className="text-sm">{t('Finding the best matches for you...')}</span>
        </div>
      )}

      {!loading && intent?.intent_summary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-foreground">
            <Sparkles className="inline h-3.5 w-3.5 text-primary mr-1.5" />
            <span className="font-medium">{t('Looking for')}:</span> {intent.intent_summary}
          </p>
        </div>
      )}

      {!loading && parsed && filtersToChips(parsed).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('We searched for')}:</span>
          {filtersToChips(parsed).map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full"
            >
              {chip.label}
            </span>
          ))}
          {onRefineWithFilters && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-1"
              onClick={() => onRefineWithFilters(parsed)}
            >
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              {t('Refine in filters')}
            </Button>
          )}
        </div>
      )}

      {!loading && properties && properties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property, index) => {
            const matchTag = [
              property.suburb && intent?.suburbs?.some(s => property.suburb?.toLowerCase().includes(s.toLowerCase())) ? property.suburb : null,
              intent?.bedrooms && property.beds >= intent.bedrooms ? `${property.beds} ${t('beds')}` : null,
            ].filter(Boolean).join(' · ');
            return (
              <div key={property.id} className="relative">
                {matchTag && (
                  <Badge className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px]">
                    {t('Match')}: {matchTag}
                  </Badge>
                )}
                <PropertyCard
                  property={property}
                  onSelect={handleSelect}
                  isSaved={savedIds.has(property.id)}
                  onToggleSave={handleToggleSave}
                  index={index}
                />
              </div>
            );
          })}
        </div>
      )}

      {!loading && properties && properties.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            {t('No exact matches — try describing the lifestyle instead of just the specs')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => { setQuery(p); runSearch(p); }}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/15 transition-colors"
              >
                {t(p)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
