import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CurrencyCode = 'AUD' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type ListingMode = 'sale' | 'rent';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number; // relative to AUD
}

const FALLBACK_CURRENCIES: CurrencyInfo[] = [
  { code: 'AUD', symbol: '$', label: 'AUD $', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD $', rate: 0.65 },
  { code: 'EUR', symbol: '€', label: 'EUR €', rate: 0.60 },
  { code: 'GBP', symbol: '£', label: 'GBP £', rate: 0.52 },
  { code: 'JPY', symbol: '¥', label: 'JPY ¥', rate: 97.5 },
];

export let CURRENCIES: CurrencyInfo[] = [...FALLBACK_CURRENCIES];

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrencyCode: (code: CurrencyCode) => void;
  convertPrice: (audPrice: number) => number;
  formatPrice: (audPrice: number, listingType?: string) => string;
  listingMode: ListingMode;
  setListingMode: (mode: ListingMode) => void;
  isLiveRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('AUD');
  const [listingMode, setListingMode] = useState<ListingMode>('sale');
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>(FALLBACK_CURRENCIES);
  const [isLiveRates, setIsLiveRates] = useState(false);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-exchange-rates');
        if (error || !data?.rates) return;

        const rates = data.rates as Record<string, number>;
        const updated = FALLBACK_CURRENCIES.map(c => ({
          ...c,
          rate: rates[c.code] ?? c.rate,
        }));
        setCurrencies(updated);
        CURRENCIES = updated;
        setIsLiveRates(true);
      } catch {
        // fallback silently
      }
    };
    fetchRates();
  }, []);

  const currency = currencies.find(c => c.code === currencyCode) || currencies[0];

  const convertPrice = useCallback((audPrice: number) => {
    return Math.round(audPrice * currency.rate);
  }, [currency]);

  const formatPrice = useCallback((audPrice: number, listingType?: string) => {
    const isRental = listingType === 'rent' || listingType === 'rental' || (!listingType && audPrice < 50000);
    const converted = convertPrice(audPrice);
    const suffix = isRental ? '/wk' : '';
    if (currency.code === 'JPY') {
      return `¥${converted.toLocaleString()}${suffix}`;
    }
    if (!isRental && converted >= 1_000_000) {
      return `${currency.symbol}${(converted / 1_000_000).toFixed(1)}M`;
    }
    if (!isRental && converted >= 1_000) {
      return `${currency.symbol}${(converted / 1_000).toFixed(0)}k`;
    }
    return `${currency.symbol}${converted.toLocaleString()}${suffix}`;
  }, [convertPrice, currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convertPrice, formatPrice, listingMode, setListingMode, isLiveRates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
