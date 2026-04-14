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

const GENERATE_URL = 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/generate-listing';

const StepVoice = ({ draft, update }: Props) => {
  const [countdown, setCountdown] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [selectedTone, setSelectedTone] = useState<Tone>('standard');
  const [streamingBullets, setStreamingBullets] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const wasListeningRef = useRef(false);

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

  // AI description generator with streaming
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
      // Fix #8: Use user's session token instead of anon key
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in again to generate listings.');
        return;
      }

      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
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

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Generation failed' }));
        toast.error(`Generation failed — ${(err.error)}`);
        setGenerating(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';
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
              fullText += content;
              setAiDescription(fullText);
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
              fullText += content;
              setAiDescription(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setAiGenerated(true);
      // Also store it in the transcript so it gets saved
      update({ voiceTranscript: fullText });
    } catch (e) {
      console.error('AI generation error:', e);
      toast.error('Generation failed — Could not connect to AI service.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Label className="text-sm font-semibold block">Voice Description</Label>

      {/* Mic button */}
      <div className="flex flex-col items-center py-6">
        <button
          type="button"
          onClick={isListening ? handleStopRecording : handleStartRecording}
          disabled={!isSupported}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-destructive text-destructive-foreground scale-110 shadow-lg'
              : 'bg-primary text-primary-foreground hover:scale-105'
          }`}
        >
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        {isListening ? (
          <div className="mt-4 text-center">
            <SoundWaveVisualizer isActive={true} />
            <p className="text-2xl font-display font-bold text-primary mt-2">{countdown}s</p>
            <p className="text-xs text-muted-foreground">Tap to stop</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">
            {isSupported ? 'Describe the property in 30 seconds' : 'Voice not supported — type below'}
          </p>
        )}
      </div>

      {/* Transcript */}
      <div>
        <Label className="text-xs flex items-center gap-1 mb-1">
          <Edit3 size={12} /> Transcript (editable)
        </Label>
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
          placeholder="Your property description will appear here, or type it manually..."
          className="bg-secondary border-border min-h-[80px] text-sm"
          rows={3}
        />
        {draft.voiceTranscript && !draft.generatedTitle && !aiGenerated && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs gap-1"
            onClick={() => generateFromTranscript(draft.voiceTranscript)}
            disabled={streamingBullets}
          >
            <Sparkles size={12} /> {streamingBullets ? 'Generating...' : 'Generate from text'}
          </Button>
        )}
      </div>

      {/* AI Description Generator */}
      <div className="bg-gradient-to-br from-purple-500/10 via-primary/5 to-violet-500/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
          <Sparkles size={12} /> AI Listing Description Generator
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-generate a polished description from your property details.
        </p>

        {/* Tone Selector */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Tone</Label>
          <div className="flex gap-1.5 flex-wrap">
            {TONES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTone(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedTone === t.key
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400'
                    : 'bg-secondary border-border text-muted-foreground hover:border-purple-500/30'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate / Regenerate Button */}
        <Button
          type="button"
          onClick={generateAiDescription}
          disabled={generating}
          className="w-full gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0"
        >
          {generating ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generating…
            </>
          ) : aiGenerated ? (
            <>
              <RefreshCw size={14} /> Regenerate ✨
            </>
          ) : (
            <>
              <Sparkles size={14} /> Generate with AI ✨
            </>
          )}
        </Button>

        {/* Streaming AI Description */}
        {(generating || aiDescription) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-3"
          >
            <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <Sparkles size={10} className="text-purple-500" /> AI Description
              {generating && <span className="text-purple-500 animate-pulse ml-1">●</span>}
            </Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {aiDescription || (
                <span className="text-muted-foreground italic">Writing…</span>
              )}
              {generating && <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />}
            </p>
          </motion.div>
        )}
      </div>

      {/* AI Generated Content from voice */}
      {(draft.generatedTitle || streamingBullets) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles size={12} /> AI-Generated Content
          </div>

          {streamingBullets ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Generating listing content...
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs mb-1 block">Suggested Title</Label>
                <Input
                  value={draft.generatedTitle}
                  onChange={(e) => update({ generatedTitle: e.target.value })}
                  className="bg-card border-border font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Key Points</Label>
                <ul className="space-y-1.5">
                  {draft.generatedBullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default StepVoice;
