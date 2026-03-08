import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function useVoiceSearch(onResult: (text: string) => void, onError?: (message: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Voice search is not supported in this browser.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('[VoiceSearch] Error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onError?.('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (event.error === 'no-speech') {
          onError?.('No speech detected. Please try again and speak clearly.');
        } else if (event.error === 'network') {
          onError?.('Network error. Voice search requires an internet connection.');
        } else if (event.error === 'aborted') {
          // User or system aborted, no error needed
        } else {
          onError?.('Voice search failed. Try typing your search instead.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error('[VoiceSearch] Failed to start:', err);
      setIsListening(false);
      onError?.('Voice search is not available. Try typing your search instead.');
    }
  }, [isSupported, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, startListening, stopListening, isSupported };
}
