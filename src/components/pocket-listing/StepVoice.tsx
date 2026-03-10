import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SoundWaveVisualizer } from '@/components/SoundWaveVisualizer';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const StepVoice = ({ draft, update }: Props) => {
  const [countdown, setCountdown] = useState(30);
  const [generating, setGenerating] = useState(false);
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
      generateFromTranscript(draft.voiceTranscript);
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

  const generateFromTranscript = (text: string) => {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      const words = text.split(' ');
      const titleWords = words.slice(0, 6).join(' ');
      update({
        generatedTitle: titleWords.length > 10 ? `Modern ${draft.propertyType} in ${draft.suburb || 'Premium Location'}` : `Stunning ${draft.propertyType} — Must See`,
        generatedBullets: [
          'Spacious open-plan living and dining',
          'Renovated kitchen with stone benchtops',
          'Private north-facing courtyard',
          'Walking distance to cafés and transport',
        ],
      });
      setGenerating(false);
    }, 1500);
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
          value={draft.voiceTranscript}
          onChange={(e) => update({ voiceTranscript: e.target.value })}
          placeholder="Your property description will appear here, or type it manually..."
          className="bg-secondary border-border min-h-[80px] text-sm"
          rows={3}
        />
        {draft.voiceTranscript && !draft.generatedTitle && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs gap-1"
            onClick={() => generateFromTranscript(draft.voiceTranscript)}
            disabled={generating}
          >
            <Sparkles size={12} /> {generating ? 'Generating...' : 'Generate from text'}
          </Button>
        )}
      </div>

      {/* AI Generated Content */}
      {(draft.generatedTitle || generating) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles size={12} /> AI-Generated Content
          </div>

          {generating ? (
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
