import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Languages, ChevronDown } from 'lucide-react';
import { useI18n, languageNames, type Language } from '@/shared/lib/i18n';
import { LANGUAGE_STORAGE_KEY, FROM_LEGACY_CODE_MAP, DEFAULT_LANGUAGE } from '@/shared/lib/i18n/config';

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setOpen(!open);
  };

  return (
    <div ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Languages size={16} />
        <span className="hidden sm:inline">{languageNames[language]}</span>
        <ChevronDown size={14} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
          className="z-[100] min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg p-2"
        >
          <div className="grid grid-cols-2 gap-0.5 max-h-80 overflow-y-auto scrollbar-thin">
            {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => {
              const isActive = code === language;
              return (
                <button
                  key={code}
                  onClick={() => {
                    setLanguage(code);
                    // Mirror to the new buyer-facing storage key so useTranslation()
                    // and any future consumers stay in sync with the legacy provider.
                    try {
                      const canonical = FROM_LEGACY_CODE_MAP[code] ?? DEFAULT_LANGUAGE;
                      localStorage.setItem(LANGUAGE_STORAGE_KEY, canonical);
                    } catch { /* storage unavailable — non-fatal */ }
                    setOpen(false);
                  }}
                  className={`text-sm px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {name}
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
