import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins, ChevronDown } from 'lucide-react';
import { useCurrency, CURRENCY_REGIONS, CURRENCIES, type CurrencyCode } from '@/shared/lib/CurrencyContext';

export function CurrencySwitcher() {
  const { currency, setCurrencyCode } = useCurrency();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

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

  const findInfo = (code: CurrencyCode) => CURRENCIES.find(c => c.code === code);

  return (
    <div ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Coins size={16} />
        <span className="hidden sm:inline">{currency.code}</span>
        <ChevronDown size={14} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
          className="z-[100] min-w-[240px] max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2"
        >
          {CURRENCY_REGIONS.map(region => (
            <div key={region.region} className="mb-2 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold">
                {region.region}
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {region.currencies.map(code => {
                  const info = findInfo(code);
                  if (!info) return null;
                  const isActive = code === currency.code;
                  return (
                    <button
                      key={code}
                      onClick={() => { setCurrencyCode(code); setOpen(false); }}
                      className={`text-sm px-3 py-2 rounded-lg text-left cursor-pointer transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-slate-100 font-medium text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{code}</span>
                      <span className="text-slate-500">{info.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
