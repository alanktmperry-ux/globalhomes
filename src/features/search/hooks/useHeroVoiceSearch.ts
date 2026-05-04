import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export function useHeroVoiceSearch(
  onResult: (transcript: string, detectedLanguage?: string) => void,
  lang = 'en-AU'
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice search works in Chrome and Safari. Try opening the site in Chrome.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Microphone access denied — please allow microphone access in your browser settings.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast.error('Nothing heard. Please try again.');
      }
    };

    recognition.start();
  }, [isListening, lang, onResult]);

  return {
    status: isListening ? 'recording' : ('idle' as const),
    statusLabel: isListening ? 'Listening...' : null,
    detectedLanguage: null,
    isRecording: isListening,
    isProcessing: false,
    startRecording,
  };
}
