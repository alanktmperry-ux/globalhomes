import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium transition-colors hover:bg-accent"
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{languageNames[language]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl shadow-xl overflow-hidden"
            style={{ backgroundColor: '#1e293b' }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="max-h-80 overflow-y-auto py-1 scrollbar-thin">
              {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => {
                const isActive = code === language;
                return (
                  <button
                    key={code}
                    onClick={() => { setLanguage(code); setOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: '#fff',
                      backgroundColor: isActive ? '#334155' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#334155';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className={isActive ? 'font-medium' : ''}>{name}</span>
                    {isActive && <Check size={15} className="text-green-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
