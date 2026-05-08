import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Lang {
  code: string;   // i18n code used in ?lang= param
  label: string;  // display label
  flag: string;   // emoji flag
  key: string;    // JSONB key in translations object
}

const LANGS: Lang[] = [
  { code: 'en',    label: 'English',    flag: '🇦🇺', key: 'en' },
  { code: 'zh-CN', label: '普通话',     flag: '🇨🇳', key: 'zh_simplified' },
  { code: 'zh-TW', label: '廣東話',     flag: '🇭🇰', key: 'zh_traditional' },
  { code: 'vi',    label: 'Tiếng Việt', flag: '🇻🇳', key: 'vi' },
  { code: 'ko',    label: '한국어',     flag: '🇰🇷', key: 'ko' },
  { code: 'ar',    label: 'العربية',    flag: '🇸🇦', key: 'ar' },
  { code: 'ja',    label: '日本語',     flag: '🇯🇵', key: 'ja' },
  { code: 'hi',    label: 'हिन्दी',    flag: '🇮🇳', key: 'hi' },
  { code: 'bn',    label: 'বাংলা',      flag: '🇧🇩', key: 'bn' },
  { code: 'tl',    label: 'Filipino',   flag: '🇵🇭', key: 'tl' },
  { code: 'id',    label: 'Bahasa',     flag: '🇮🇩', key: 'id' },
];

interface Props {
  translations: Record<string, any> | null | undefined;
  currentLang: string;
  onChange?: (code: string) => void;
}

export function ListingLanguageSwitcher({ translations, currentLang, onChange }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const available = LANGS.filter((l) => {
    if (l.code === 'en') return true;
    if (!translations) return false;
    const t = translations[l.key] as Record<string, any> | undefined;
    return !!(t && (t.title || t.description));
  });

  if (available.length <= 1) return null;

  function switchTo(code: string) {
    const params = new URLSearchParams(location.search);
    if (code === 'en') params.delete('lang');
    else params.set('lang', code);
    const newSearch = params.toString();
    navigate(`${location.pathname}${newSearch ? '?' + newSearch : ''}`, { replace: true });
    onChange?.(code);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 py-2.5 px-4 bg-card rounded-xl border border-border">
      <span className="text-xs text-muted-foreground font-medium mr-1">View in:</span>
      {available.map((lang) => {
        const active = currentLang === lang.code || (lang.code === 'en' && (!currentLang || currentLang === 'en'));
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => switchTo(lang.code)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-accent',
            )}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ListingLanguageSwitcher;
