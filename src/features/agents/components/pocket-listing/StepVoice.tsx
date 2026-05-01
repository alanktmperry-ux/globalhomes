import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Sparkles, Edit3, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SoundWaveVisualizer } from '@/features/search/components/SoundWaveVisualizer';
import { useVoiceSearch } from '@/features/search/hooks/useVoiceSearch';
import { VoiceMicButton } from '@/shared/components/VoiceMicButton';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { toast } from 'sonner';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const TONES = [
  { key: 'standard', label: 'Standard', emoji: '🏡' },
  { key: 'luxury', label: 'Luxury', emoji: '✨' },
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { key: 'investment', label: 'Investment', emoji: '📈' },
] as const;

type Tone = typeof TONES[number]['key'];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://ngrkbohpmkzjonaofgbb.supabase.co';

const StepVoice = ({ draft, update }: Props) => {
  const [countdown, setCountdown] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [selectedTone, setSelectedTone] = useState<Tone>('standard');
  const [streamingBullets, setStreamingBullets] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const wasListeningRef = useRef(false);
  const { language } = useTranslation();

  const onVoiceResult = useCallback((text: string) => {
    update({ voiceTranscript: text });
  }, [update]);

  const { isListening, startListening, stopListening, isSupported } = useVoiceSearch(onVoiceResult);

  // When recording stops, auto-generate from transcript
  useEffect(() => {
    if (wasListeningRef.current && !isListening && draft.voiceTranscript) {
      clearInterval(timerRef.current);
      setCountdown(30);
      void generateFromTranscript(draft.voiceTranscript);
    }
    wasListeningRef.current = isListening;
  }, [isListening]);

  const handleStartRecording = () => {
    update({ voiceTranscript: '', generatedTitle: '', generatedBullets: [] });
    startListening();
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          stopListening();
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    stopListening();
    clearInterval(timerRef.current);
    setCountdown(30);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const generateFromTranscript = async (text: string) => {
    if (!text.trim()) return;
    setStreamingBullets(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      const { data, error } = await supabase.functions.invoke('generate-listing', {
        body: {
          propertyType: draft.propertyType,
          beds: draft.beds,
          baths: draft.baths,
          parking: draft.cars,
          suburb: draft.suburb,
          state: draft.state,
          price: draft.priceMax > 0 ? `$${draft.priceMax.toLocaleString('en-AU')}` : 'Contact Agent',
          features: draft.features,
          tone: 'standard',
          voiceTranscript: text,
        },
      });

      if (error) throw error;

      const content = typeof data === 'string' ? data : JSON.stringify(data);
      const lines = content.split('\n').filter((l: string) => l.trim().length > 10);
      const bullets = lines.slice(0, 5);

      update({
        generatedTitle: `${draft.beds > 0 ? `${draft.beds}-Bed ` : ''}${draft.propertyType} in ${draft.suburb || 'Premium Location'}`,
        generatedBullets: bullets.length > 0 ? bullets : ['See description for full details'],
      });
    } catch (e) {
      console.error('generateFromTranscript error:', e);
      toast.error('Could not generate from voice — please use the AI generator below.');
    } finally {
      setStreamingBullets(false);
    }
  };

  // AI description generator
  const generateAiDescription = async () => {
    setGenerating(true);
    setAiDescription('');
    setAiGenerated(false);

    const formatPrice = (d: ListingDraft) => {
      const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
      if (d.priceDisplay === 'exact') return fmt(d.priceMax);
      if (d.priceDisplay === 'range') return `${fmt(d.priceMin)} – ${fmt(d.priceMax)}`;
      if (d.priceDisplay === 'eoi') return 'Expressions of Interest';
      return 'Contact Agent';
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to generate descriptions');
        setGenerating(false);
        return;
      }

      const url = `${SUPABASE_URL}/functions/v1/generate-listing`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyType: draft.propertyType,
          beds: draft.beds,
          baths: draft.baths,
          parking: draft.cars,
          suburb: draft.suburb,
          state: draft.state,
          price: formatPrice(draft),
          features: draft.features,
          tone: selectedTone,
          voiceTranscript: draft.voiceTranscript || '',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiDescription(fullText);
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      update({ voiceTranscript: fullText });
      setAiGenerated(true);
    } catch (e) {
      console.error('AI generation error:', e);
      toast.error('Generation failed — Could not connect to AI service.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── STEP HEADER ── */}
      <div>
        <h3 className="text-base font-semibold">Describe your property</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record your voice notes or type — then let AI write a polished listing description.
        </p>
      </div>

      {/* ── RECORD SECTION ── */}
      <div className={`rounded-2xl border-2 transition-all p-6 ${isListening ? 'border-red-400 bg-red-500/5' : 'border-dashed border-border bg-secondary/40'}`}>
        <div className="flex flex-col items-center gap-4">

          {/* Mic button */}
          <button
            type="button"
            onClick={isListening ? handleStopRecording : handleStartRecording}
            disabled={!isSupported}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md ${
              isListening
                ? 'bg-red-500 text-white scale-110 shadow-red-200'
                : 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
            )}
            {isListening ? <MicOff size={30} /> : <Mic size={30} />}
          </button>

          {/* Status text */}
          {isListening ? (
            <div className="text-center space-y-1">
              <SoundWaveVisualizer isActive={true} />
              <p className="text-3xl font-bold tabular-nums text-red-500">{countdown}s</p>
              <p className="text-xs text-muted-foreground">Tap the mic to stop recording</p>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">
                {isSupported ? 'Tap to record your property notes' : 'Voice not supported in this browser'}
              </p>
              <p className="text-xs text-muted-foreground">
                Speak naturally — mention bedrooms, features, lifestyle, what makes it special
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSCRIPT ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Edit3 size={13} /> Your notes
          </Label>
          {draft.voiceTranscript && (
            <button
              type="button"
              onClick={() => update({ voiceTranscript: '', generatedTitle: '', generatedBullets: [] })}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <RefreshCw size={11} /> Clear & redo
            </button>
          )}
        </div>
        <div className="relative">
          <Textarea
            value={aiGenerated ? aiDescription : draft.voiceTranscript}
            onChange={(e) => {
              if (aiGenerated) {
                setAiDescription(e.target.value);
                update({ voiceTranscript: e.target.value });
              } else {
                update({ voiceTranscript: e.target.value });
              }
            }}
            placeholder="Your recorded notes will appear here, or type directly…"
            className="min-h-[100px] resize-y text-sm pr-10"
            rows={4}
          />
          <VoiceMicButton
            onTranscript={(t) => {
              if (aiGenerated) {
                setAiDescription(t);
                update({ voiceTranscript: t });
              } else {
                update({ voiceTranscript: t });
              }
            }}
            existingValue={aiGenerated ? aiDescription : draft.voiceTranscript}
            language={language}
            className="absolute right-2 top-2 w-7 h-7"
            size={14}
          />
        </div>
        {draft.voiceTranscript && (
          <p className="text-xs text-muted-foreground">{draft.voiceTranscript.length} characters</p>
        )}
      </div>

      {/* ── AI GENERATOR ── */}
      <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 p-5 space-y-4">

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Listing Description</p>
            <p className="text-xs text-muted-foreground">Generates a professional 3-paragraph description in seconds</p>
          </div>
        </div>

        {/* Tone selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Writing tone</Label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTone(t.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  selectedTone === t.key
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-card border-border text-muted-foreground hover:border-purple-400'
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          type="button"
          onClick={generateAiDescription}
          disabled={generating}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0 h-11 text-sm font-semibold"
        >
          {generating ? (
            <><Loader2 size={15} className="animate-spin" /> Writing your description…</>
          ) : aiGenerated ? (
            <><RefreshCw size={15} /> Regenerate description</>
          ) : (
            <><Sparkles size={15} /> Generate listing description ✨</>
          )}
        </Button>

        {/* Streaming result */}
        {(generating || aiDescription) && (
          <div className="bg-white dark:bg-card rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles size={10} className="text-purple-500" />
                {generating ? 'Writing…' : 'Generated description'}
              </Label>
              {aiGenerated && !generating && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(aiDescription)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Copy
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {aiDescription || <span className="text-muted-foreground italic">Writing your listing description…</span>}
              {generating && <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />}
            </p>
          </div>
        )}
      </div>

      {/* ── AI-GENERATED CONTENT FROM VOICE ── */}
      {(draft.generatedTitle || streamingBullets) && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles size={12} /> AI-Generated Listing Content
          </div>
          {streamingBullets ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Generating listing content…
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs mb-1 block">Suggested Title</Label>
                <Input
                  value={draft.generatedTitle}
                  onChange={(e) => update({ generatedTitle: e.target.value })}
                  className="font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Key Points</Label>
                <ul className="space-y-1.5">
                  {draft.generatedBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5 font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StepVoice;
