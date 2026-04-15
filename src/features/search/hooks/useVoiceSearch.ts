import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/shared/lib/i18n';

export function useVoiceSearch(
  onResult: (text: string) => void,
  onError?: (msg: string) => void
) {
  const { language } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      onError?.('Microphone not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        if (chunksRef.current.length === 0) return;

        setIsTranscribing(true);

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });

          // Convert blob to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const { data, error } = await supabase.functions.invoke(
            'voice-search',
            {
              body: { audio: base64, mimeType },
            }
          );

          if (error) throw error;

          if (data?.success && data?.transcript?.trim()) {
            onResult(data.transcript.trim());
          } else if (data?.error) {
            onError?.(data.error);
          } else {
            onError?.('No speech detected. Please try again.');
          }
        } catch (err: unknown) {
          console.error('[VoiceSearch]', err);
          onError?.('Transcription failed. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);

    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        onError?.('Microphone access denied. Please allow microphone permissions and try again.');
      } else {
        onError?.('Could not access microphone. Please try again.');
      }
      setIsListening(false);
    }
  }, [isSupported, onResult, onError]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isTranscribing,
    startListening,
    stopListening,
    isSupported,
  };
}
