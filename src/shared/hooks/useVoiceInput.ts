import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  language?: string; // BCP-47 e.g. 'zh-CN', 'vi', 'en'
  append?: boolean;  // append to existing value (default true)
}

export function useVoiceInput({ onTranscript, language = 'en' }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick the best supported MIME type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(m => MediaRecorder.isTypeSupported(m)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState('transcribing');

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `recording.${ext}`, { type: mimeType || 'audio/webm' });

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error('Not authenticated');

          const form = new FormData();
          form.append('audio', file);
          form.append('language', language);

          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: form,
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const { text } = await res.json();
          if (text) onTranscript(text);
        } catch (err) {
          console.error('Voice transcription error:', err);
          toast.error('Voice transcription failed — please try again.');
        } finally {
          setState('idle');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      console.error('Microphone access error:', err);
      toast.error('Microphone access denied — please allow microphone in your browser settings.');
      setState('idle');
    }
  }, [state, language, onTranscript]);

  const stop = useCallback(() => {
    if (state === 'recording' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const toggle = useCallback(() => {
    if (state === 'idle') start();
    else if (state === 'recording') stop();
  }, [state, start, stop]);

  return { state, toggle, start, stop, isSupported };
}
