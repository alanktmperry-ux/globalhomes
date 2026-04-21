import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { useI18n, type Language } from '@/shared/lib/i18n';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  LEGACY_CODE_MAP,
  FROM_LEGACY_CODE_MAP,
  type SupportedLanguageCode,
} from '@/shared/lib/i18n/config';

// Locales with complete translation files. Others render as "Coming soon".
const AVAILABLE_LOCALES: ReadonlySet<SupportedLanguageCode> = new Set([
  'en',
  'zh-CN',
  'zh-TW',
  'hi',
  'bn',
]);

const INTERACTED_KEY = 'gh-lang-switcher-interacted';

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(() => {
    try { return localStorage.getItem(INTERACTED_KEY) === '1'; } catch { return true; }
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markInteracted = () => {
    if (hasInteracted) return;
    setHasInteracted(true);
    try { localStorage.setItem(INTERACTED_KEY, '1'); } catch { /* non-fatal */ }
  };

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
    markInteracted();
    setOpen(!open);
  };

  const activeName = SUPPORTED_LANGUAGES.find(l => l.code === (FROM_LEGACY_CODE_MAP[language] ?? 'en'))?.name ?? 'English';

  return (
    <div ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label={`Change language (current: ${activeName})`}
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{activeName}</span>
        <ChevronDown size={14} />
        {!hasInteracted && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
          className="z-[100] min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg p-2"
        >
          <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto scrollbar-thin">
            {SUPPORTED_LANGUAGES.map(({ code, name }) => {
              const activeCanonical = FROM_LEGACY_CODE_MAP[language] ?? 'en';
              const isActive = code === activeCanonical;
              const isAvailable = AVAILABLE_LOCALES.has(code);
              return (
                <button
                  key={code}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return;
                    const legacy = (LEGACY_CODE_MAP[code] ?? 'en') as Language;
                    setLanguage(legacy);
                    try {
                      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
                    } catch { /* storage unavailable — non-fatal */ }
                    setOpen(false);
                  }}
                  className={`text-sm px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                    !isAvailable
                      ? 'text-slate-400 cursor-not-allowed'
                      : isActive
                        ? 'bg-slate-100 font-medium text-slate-900 cursor-pointer'
                        : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  <span>{name}</span>
                  {!isAvailable && (
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 ml-2">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
