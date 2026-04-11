import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type VoiceStatus = 'idle' | 'listening' | 'processing';

export function useHeroVoiceSearch(onResult: (transcript: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(async () => {
    if (status === 'listening') {
      // Stop current session
      recognitionRef.current?.stop();
      setStatus('idle');
      return;
    }

    // Request mic permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately — we only needed permission
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Microphone access denied — please allow mic access in your browser settings.');
      return;
    }

    if (!isSupported) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }

    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-AU';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setStatus('idle');
          onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setStatus('idle');
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied — please allow mic access in your browser settings.');
        }
      };

      recognition.onend = () => {
        setStatus('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setStatus('listening');
    } catch {
      toast.error('Could not start voice search.');
      setStatus('idle');
    }
  }, [status, isSupported, onResult]);

  return { status, startListening, isListening: status === 'listening' };
}
