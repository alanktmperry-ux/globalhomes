import { cn } from '@/lib/utils';

const LANGUAGE_DISPLAY: Record<string, { flag: string; name: string }> = {
  zh: { flag: '🇨🇳', name: 'Chinese' },
  'zh-cn': { flag: '🇨🇳', name: 'Chinese (Simplified)' },
  'zh-tw': { flag: '🇹🇼', name: 'Chinese (Traditional)' },
  ja: { flag: '🇯🇵', name: 'Japanese' },
  ko: { flag: '🇰🇷', name: 'Korean' },
  vi: { flag: '🇻🇳', name: 'Vietnamese' },
  th: { flag: '🇹🇭', name: 'Thai' },
  id: { flag: '🇮🇩', name: 'Indonesian' },
  ms: { flag: '🇲🇾', name: 'Malay' },
  tl: { flag: '🇵🇭', name: 'Filipino' },
  fil: { flag: '🇵🇭', name: 'Filipino' },
  hi: { flag: '🇮🇳', name: 'Hindi' },
  bn: { flag: '🇧🇩', name: 'Bengali' },
  ta: { flag: '🇮🇳', name: 'Tamil' },
  pa: { flag: '🇮🇳', name: 'Punjabi' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fa: { flag: '🇮🇷', name: 'Persian' },
  ru: { flag: '🇷🇺', name: 'Russian' },
  it: { flag: '🇮🇹', name: 'Italian' },
  es: { flag: '🇪🇸', name: 'Spanish' },
  fr: { flag: '🇫🇷', name: 'French' },
  pt: { flag: '🇵🇹', name: 'Portuguese' },
  el: { flag: '🇬🇷', name: 'Greek' },
  en: { flag: '🇬🇧', name: 'English' },
};

export function BuyerLanguageBadge({ language, className }: { language: string; className?: string }) {
  const lang = language.toLowerCase();
  const display = LANGUAGE_DISPLAY[lang] ?? { flag: '', name: lang.toUpperCase() };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium',
        className
      )}
      title={`Buyer's preferred language: ${display.name}`}
    >
      <span aria-hidden="true">{display.flag}</span>
      <span>{display.name}</span>
    </span>
  );
}
