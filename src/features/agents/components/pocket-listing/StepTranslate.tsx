import { useState } from 'react';
import { Sparkles, Loader2, Languages, Save, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceSearch } from '@/features/search/hooks/useVoiceSearch';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

type LangKey = 'zh-CN' | 'zh-TW' | 'ja' | 'ko';

const LANGUAGES: {
  key: LangKey;
  flag: string;
  label: string;
  titleField: keyof ListingDraft;
  descField: keyof ListingDraft;
}[] = [
  { key: 'zh-CN', flag: '🇨🇳', label: 'Chinese (Simplified)', titleField: 'title_zh', descField: 'description_zh' },
  { key: 'zh-TW', flag: '🇹🇼', label: 'Chinese (Traditional)', titleField: 'title_zh_tw', descField: 'description_zh_tw' },
  { key: 'ja', flag: '🇯🇵', label: 'Japanese', titleField: 'title_ja', descField: 'description_ja' },
  { key: 'ko', flag: '🇰🇷', label: 'Korean', titleField: 'title_ko', descField: 'description_ko' },
];

const TITLE_LIMIT = 120;

const StepTranslate = ({ draft, update }: Props) => {
  const [activeLang, setActiveLang] = useState<LangKey>('zh-CN');
  const [translating, setTranslating] = useState<LangKey | null>(null);

  const active = LANGUAGES.find((l) => l.key === activeLang)!;
  const titleValue = (draft[active.titleField] as string) || '';
  const descValue = (draft[active.descField] as string) || '';

  const titleVoice = useVoiceSearch(
    (text) => update({ [active.titleField]: text.slice(0, TITLE_LIMIT) } as Partial<ListingDraft>),
    (msg) => toast.error(msg),
  );
  const descVoice = useVoiceSearch(
    (text) => update({ [active.descField]: text } as Partial<ListingDraft>),
    (msg) => toast.error(msg),
  );

  const sourceTitle = draft.generatedTitle || `${draft.propertyType} in ${draft.suburb || 'Location'}`;
  const sourceDescription = [
    draft.voiceTranscript,
    ...(draft.generatedBullets.length > 0
      ? ['', 'Key Features:', ...draft.generatedBullets.map((b) => `• ${b}`)]
      : []),
  ]
    .filter(Boolean)
    .join('\n');

  const handleAutoTranslate = async () => {
    if (!sourceTitle.trim() && !sourceDescription.trim()) {
      toast.error('Add a title or description in the previous steps first.');
      return;
    }
    setTranslating(activeLang);
    try {
      const { data, error } = await supabase.functions.invoke('generate-translations', {
        body: {
          type: 'translate_text',
          target_language: activeLang,
          title: sourceTitle,
          description: sourceDescription,
          bullets: draft.generatedBullets,
        },
      });

      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || 'Translation failed');

      update({
        [active.titleField]: (data.title as string) || '',
        [active.descField]: (data.description as string) || '',
      } as Partial<ListingDraft>);

      toast.success(`Translated to ${active.label}`);
    } catch (e) {
      console.error('translate error:', e);
      toast.error('Translation failed — please try again or enter manually');
    } finally {
      setTranslating(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-primary" />
          <Label className="text-base font-semibold">Multilingual Listing (Optional)</Label>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reach international buyers — add your listing in Chinese and other languages
        </p>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1.5 flex-wrap border-b border-border pb-2">
        {LANGUAGES.map((lang) => {
          const filled = !!((draft[lang.titleField] as string) || (draft[lang.descField] as string));
          return (
            <button
              key={lang.key}
              type="button"
              onClick={() => setActiveLang(lang.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                activeLang === lang.key
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {filled && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
            </button>
          );
        })}
      </div>

      {/* Active language panel */}
      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleAutoTranslate}
          disabled={translating !== null}
          className="w-full gap-2"
        >
          {translating === activeLang ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Translating…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Auto-translate from English
            </>
          )}
        </Button>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Title in {active.label}</Label>
            {titleVoice.isSupported && (
              <button
                type="button"
                onClick={titleVoice.isListening ? titleVoice.stopListening : titleVoice.startListening}
                disabled={titleVoice.isTranscribing}
                className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                aria-label={titleVoice.isListening ? 'Stop recording' : 'Start voice input'}
              >
                {titleVoice.isTranscribing ? (
                  <Loader2 size={12} className="animate-spin text-muted-foreground" />
                ) : titleVoice.isListening ? (
                  <MicOff size={12} className="text-red-500" />
                ) : (
                  <Mic size={12} className="text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          <Textarea
            value={titleValue}
            onChange={(e) =>
              update({ [active.titleField]: e.target.value.slice(0, TITLE_LIMIT) } as Partial<ListingDraft>)
            }
            placeholder={`Enter title in ${active.label}…`}
            rows={1}
            className={`bg-secondary border-border text-sm resize-none ${titleVoice.isListening ? 'ring-1 ring-red-400' : ''}`}
            maxLength={TITLE_LIMIT}
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">
            {titleValue.length} / {TITLE_LIMIT}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Description in {active.label}</Label>
            {descVoice.isSupported && (
              <button
                type="button"
                onClick={descVoice.isListening ? descVoice.stopListening : descVoice.startListening}
                disabled={descVoice.isTranscribing}
                className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                aria-label={descVoice.isListening ? 'Stop recording' : 'Start voice input'}
              >
                {descVoice.isTranscribing ? (
                  <Loader2 size={12} className="animate-spin text-muted-foreground" />
                ) : descVoice.isListening ? (
                  <MicOff size={12} className="text-red-500" />
                ) : (
                  <Mic size={12} className="text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          <Textarea
            value={descValue}
            onChange={(e) => update({ [active.descField]: e.target.value } as Partial<ListingDraft>)}
            placeholder={`Enter description in ${active.label}…`}
            rows={5}
            className={`bg-secondary border-border text-sm ${descVoice.isListening ? 'ring-1 ring-red-400' : ''}`}
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">
            {descValue.length} characters
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          Buyers searching in {active.label} will see this version
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.success(`Saved ${active.label} translations`)}
        >
          <Save size={12} /> Save translations
        </Button>
      </div>
    </div>
  );
};

export default StepTranslate;
