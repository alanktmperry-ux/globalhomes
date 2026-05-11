import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation, type Language } from '@/shared/lib/i18n';
import { LANGUAGE_STORAGE_KEY } from '@/shared/lib/i18n/config';
import { supabase } from '@/integrations/supabase/client';

// Full display list — 21 languages, ordered. `legacy` is the value written to the
// existing I18nProvider; `available` toggles "Soon" when no translation file exists.
type DisplayLang = {
  code: string;        // canonical code used for storage
  legacy: Language;    // value the legacy I18nProvider understands
  short: string;       // 2-3 char chip label shown on the trigger
  flag: string;
  name: string;
  available: boolean;
};

const DISPLAY_LANGUAGES: DisplayLang[] = [
  { code: 'en',    legacy: 'en',    short: 'EN', flag: '🇦🇺', name: 'English',          available: true },
  { code: 'zh-CN', legacy: 'zh',    short: '简', flag: '🇨🇳', name: '简体中文 · Mandarin',  available: true },
  { code: 'yue',   legacy: 'zh-TW', short: '粤', flag: '🇭🇰', name: '粵語 · Cantonese',     available: true },
  { code: 'zh-TW', legacy: 'zh-TW', short: '繁', flag: '🇹🇼', name: '繁體中文',             available: true },
  { code: 'vi',    legacy: 'vi',    short: 'VI', flag: '🇻🇳', name: 'Tiếng Việt',          available: true },
  { code: 'ko',    legacy: 'ko',    short: 'KO', flag: '🇰🇷', name: '한국어',                available: true },
  { code: 'ar',    legacy: 'ar',    short: 'AR', flag: '🇸🇦', name: 'العربية',             available: true },
  { code: 'hi',    legacy: 'hi',    short: 'HI', flag: '🇮🇳', name: 'हिन्दी',               available: true },
  { code: 'pa',    legacy: 'pa',    short: 'PA', flag: '🇮🇳', name: 'ਪੰਜਾਬੀ',                available: true },
  { code: 'bn',    legacy: 'bn',    short: 'BN', flag: '🇧🇩', name: 'বাংলা',                available: true },
  { code: 'ta',    legacy: 'ta',    short: 'TA', flag: '🇮🇳', name: 'தமிழ்',                available: true },
  { code: 'th',    legacy: 'th',    short: 'TH', flag: '🇹🇭', name: 'ภาษาไทย',             available: true },
  { code: 'fil',   legacy: 'fil',   short: 'FIL', flag: '🇵🇭', name: 'Filipino',          available: true },
  { code: 'id',    legacy: 'id',    short: 'ID', flag: '🇮🇩', name: 'Bahasa Indonesia',   available: true },
  { code: 'ms',    legacy: 'ms',    short: 'MS', flag: '🇲🇾', name: 'Bahasa Melayu',      available: true },
  { code: 'it',    legacy: 'it',    short: 'IT', flag: '🇮🇹', name: 'Italiano',           available: true },
  { code: 'el',    legacy: 'en',    short: 'EL', flag: '🇬🇷', name: 'Ελληνικά · Greek',   available: false },
  { code: 'es',    legacy: 'es',    short: 'ES', flag: '🇪🇸', name: 'Español',            available: true },
  { code: 'pt',    legacy: 'pt',    short: 'PT', flag: '🇵🇹', name: 'Português',          available: true },
  { code: 'fr',    legacy: 'fr',    short: 'FR', flag: '🇫🇷', name: 'Français',           available: true },
  { code: 'ru',    legacy: 'ru',    short: 'RU', flag: '🇷🇺', name: 'Русский',            available: true },
];

const MANUAL_SET_KEY = 'listhq_language_manually_set';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Resolve which DisplayLang is active. Prefer the canonical key in localStorage
  // (so 'yue' and 'zh-TW' can be distinguished even though both map to legacy 'zh-TW').
  const storedCanonical = (() => {
    try { return localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch { return null; }
  })();
  const active =
    DISPLAY_LANGUAGES.find(l => l.code === storedCanonical) ??
    DISPLAY_LANGUAGES.find(l => l.legacy === language) ??
    DISPLAY_LANGUAGES[0];

  useEffect(() => {
    try { document.documentElement.dir = active.code === 'ar' ? 'rtl' : 'ltr'; } catch { /* */ }
  }, [active.code]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setDropdownPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    }
    setOpen(o => !o);
  };

  const selectLang = async (item: DisplayLang) => {
    if (!item.available) return;
    setLanguage(item.legacy);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, item.code);
      sessionStorage.setItem(LANGUAGE_STORAGE_KEY, item.code);
      localStorage.setItem('i18n-language', item.legacy);
      sessionStorage.setItem('i18n-language', item.legacy);
      localStorage.removeItem('gh-lang');
      localStorage.setItem('listhq_lang_user_set', '1');
      localStorage.setItem(MANUAL_SET_KEY, item.code === 'en' ? 'false' : 'true');
    } catch { /* non-fatal */ }
    setOpen(false);
    document.documentElement.dir = item.code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = item.code;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language_preference: item.code }).eq('id', user.id);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[LanguageSwitcher] persist failed', err);
    }
  };

  return (
    <div ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] font-semibold text-[#374151] hover:border-[rgba(37,99,235,0.3)] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors"
        style={{ padding: '7px 13px' }}
        aria-label={`Change language (current: ${active.name})`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[14px] leading-none">{active.flag}</span>
        <span className="tracking-wide">{active.short}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          data-settings-portal-ignore
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
          className="z-[9999] min-w-[260px] bg-white border border-[#E5E5E5] rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-2"
          role="listbox"
        >
          <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
            {DISPLAY_LANGUAGES.map((item) => {
              const isActive = item.code === active.code;
              return (
                <button
                  key={item.code}
                  disabled={!item.available}
                  onClick={() => selectLang(item)}
                  role="option"
                  aria-selected={isActive}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] transition-colors ${
                    !item.available
                      ? 'text-[#9CA3AF] cursor-not-allowed'
                      : isActive
                        ? 'bg-[#EFF6FF] text-[#1d4ed8] font-semibold cursor-pointer'
                        : 'text-[#1a1a1a] hover:bg-[#F9FAFB] cursor-pointer'
                  }`}
                >
                  <span className="text-[18px] leading-none w-6 text-center">{item.flag}</span>
                  <span className="flex-1">{item.name}</span>
                  {!item.available && (
                    <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Soon</span>
                  )}
                  {isActive && item.available && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
