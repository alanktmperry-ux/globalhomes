import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceInput } from '@/shared/hooks/useVoiceInput';

interface Props {
  onTranscript: (text: string) => void;
  language?: string;
  className?: string;
  size?: number;
  existingValue?: string;
}

export function VoiceMicButton({ onTranscript, language = 'en', className = '', size = 16, existingValue }: Props) {
  const { state, toggle, isSupported } = useVoiceInput({
    onTranscript: (text) => {
      const joined = existingValue ? `${existingValue} ${text}` : text;
      onTranscript(joined.trim());
    },
    language,
  });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === 'transcribing'}
      title={state === 'idle' ? 'Click to record' : state === 'recording' ? 'Click to stop' : 'Transcribing…'}
      className={`flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        state === 'recording'
          ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-md'
          : state === 'transcribing'
            ? 'bg-slate-200 text-slate-500 cursor-wait'
            : 'bg-slate-100 text-slate-500 hover:bg-primary/10 hover:text-primary'
      } ${className}`}
    >
      {state === 'transcribing'
        ? <Loader2 size={size} className="animate-spin" />
        : state === 'recording'
          ? <MicOff size={size} />
          : <Mic size={size} />
      }
    </button>
  );
}
