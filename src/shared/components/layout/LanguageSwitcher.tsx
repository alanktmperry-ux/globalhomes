import { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { useI18n, languageNames, type Language } from '@/shared/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Languages size={16} />
        <span className="hidden sm:inline">{languageNames[language]}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-[100] min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2">
          <div className="grid grid-cols-2 gap-0.5 max-h-80 overflow-y-auto scrollbar-thin">
            {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => {
              const isActive = code === language;
              return (
                <button
                  key={code}
                  onClick={() => { setLanguage(code); setOpen(false); }}
                  className={`text-sm px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-700 font-medium text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
