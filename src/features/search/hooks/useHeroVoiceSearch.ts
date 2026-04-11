import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type VoiceStatus = 'idle' | 'recording' | 'processing';

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
  return 'audio/webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useHeroVoiceSearch(onResult: (transcript: string, detectedLanguage?: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    silenceStartRef.current = null;
    rafRef.current = null;
    silenceTimerRef.current = null;
    maxTimerRef.current = null;
    chunksRef.current = [];
  }, []);

  const stopAndProcess = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || getSupportedMimeType();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();

        if (blob.size < 1000) {
          setStatus('idle');
          setStatusLabel(null);
          toast.error('No audio captured. Please try again and speak clearly.');
          resolve();
          return;
        }

        setStatus('processing');
        setStatusLabel('Transcribing...');

        try {
          const base64 = await blobToBase64(blob);

          const { data, error } = await supabase.functions.invoke('voice-search', {
            body: { audio: base64, mimeType },
          });

          if (error) throw error;

          if (data?.success && data.transcript) {
            setDetectedLanguage(data.detected_language || null);
            onResult(data.transcript, data.detected_language);
          } else if (data?.error) {
            toast.error(data.error);
          } else {
            toast.error('No speech detected. Please try again.');
          }
        } catch (err) {
          console.error('Voice search error:', err);
          toast.error('Voice search failed. Please try again.');
        } finally {
          setStatus('idle');
          setStatusLabel(null);
        }
        resolve();
      };

      recorder.stop();
    });
  }, [cleanup, onResult]);

  const startRecording = useCallback(async () => {
    // If already recording, stop
    if (status === 'recording') {
      stopAndProcess();
      return;
    }

    // Request mic
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Microphone access denied — please enable it in your browser settings.');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      // Fallback without specifying mimeType
      recorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(250); // collect chunks every 250ms
    setStatus('recording');
    setStatusLabel('Listening...');
    setDetectedLanguage(null);

    // ── Silence detection via AudioContext ──
    try {
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);
      silenceStartRef.current = null;

      const checkSilence = () => {
        if (!analyserRef.current) return;
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms < 0.01) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 1500) {
            // 1.5s of silence → auto-stop
            stopAndProcess();
            return;
          }
        } else {
          silenceStartRef.current = null;
        }

        rafRef.current = requestAnimationFrame(checkSilence);
      };

      rafRef.current = requestAnimationFrame(checkSilence);
    } catch {
      // AudioContext not available — fall through to max timer only
    }

    // Max recording duration: 15 seconds
    maxTimerRef.current = setTimeout(() => {
      stopAndProcess();
    }, 15000);
  }, [status, stopAndProcess]);

  return {
    status,
    statusLabel,
    detectedLanguage,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    startRecording,
  };
}
