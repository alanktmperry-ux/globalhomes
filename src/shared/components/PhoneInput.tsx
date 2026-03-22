import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: '+66', flag: '🇹🇭', name: 'Thailand' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey' },
  { code: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  className?: string;
}

const PhoneInput = ({ value, onChange, className = '' }: PhoneInputProps) => {
  const [countryCode, setCountryCode] = useState('+61');
  const [localNumber, setLocalNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value && !localNumber) {
      const match = COUNTRY_CODES.find((c) => value.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        setLocalNumber(value.slice(match.code.length).trim());
      } else {
        setLocalNumber(value);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNumberChange = (num: string) => {
    const digits = num.replace(/\D/g, '');
    let formatted = digits;
    if (countryCode === '+61') {
      // Strip leading zero — not used when country code is present
      const local = digits.startsWith('0') ? digits.slice(1) : digits;
      if (local.length <= 3) {
        formatted = local;
      } else if (local.length <= 6) {
        formatted = `${local.slice(0, 3)} ${local.slice(3)}`;
      } else {
        formatted = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
      }
    } else {
      formatted = digits
        .replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
        .trim();
    }
    setLocalNumber(formatted);
    onChange(formatted ? `${countryCode} ${formatted}` : '');
  };

  const handleCodeSelect = (code: string) => {
    setCountryCode(code);
    setOpen(false);
    setSearch('');
    onChange(localNumber ? `${code} ${localNumber}` : '');
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);
  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  return (
    <div className={`relative flex ${className}`}>
      {/* Country code button */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 h-full px-3 rounded-l-full border border-r-0 border-border bg-muted/50 text-sm text-foreground hover:bg-accent transition-colors min-w-[90px]"
        >
          <span className="text-base">{selectedCountry?.flag}</span>
          <span className="font-medium">{countryCode}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto rounded-xl border border-border bg-popover shadow-lg z-50">
            <div className="sticky top-0 bg-popover p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                autoFocus
              />
            </div>
            {filtered.map((c) => (
              <button
                key={c.code + c.name}
                type="button"
                onClick={() => handleCodeSelect(c.code)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left ${
                  c.code === countryCode ? 'bg-accent/50 font-medium' : ''
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="text-foreground">{c.name}</span>
                <span className="text-muted-foreground ml-auto">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone number input */}
      <input
        type="tel"
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder="412 345 678"
        className="flex-1 px-4 py-3.5 rounded-r-full border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
};

export default PhoneInput;
