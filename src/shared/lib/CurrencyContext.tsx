import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CurrencyCode = 'AUD' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'HKD' | 'CNY' | 'AED' | 'MYR' | 'NZD' | 'CAD' | 'INR';
export type ListingMode = 'sale' | 'rent';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number; // relative to AUD
}

export interface CurrencyRegion {
  region: string;
  currencies: CurrencyCode[];
}

export const CURRENCY_REGIONS: CurrencyRegion[] = [
  { region: 'Oceania', currencies: ['AUD', 'NZD'] },
  { region: 'Asia', currencies: ['JPY', 'SGD', 'HKD', 'CNY', 'MYR', 'INR'] },
  { region: 'Middle East', currencies: ['AED'] },
  { region: 'Americas', currencies: ['USD', 'CAD'] },
  { region: 'Europe', currencies: ['EUR', 'GBP'] },
];

const FALLBACK_CURRENCIES: CurrencyInfo[] = [
  { code: 'AUD', symbol: '$', label: 'AUD $', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD $', rate: 0.65 },
  { code: 'EUR', symbol: '€', label: 'EUR €', rate: 0.60 },
  { code: 'GBP', symbol: '£', label: 'GBP £', rate: 0.52 },
  { code: 'JPY', symbol: '¥', label: 'JPY ¥', rate: 97.5 },
  { code: 'SGD', symbol: 'S$', label: 'SGD S$', rate: 0.87 },
  { code: 'HKD', symbol: 'HK$', label: 'HKD HK$', rate: 5.08 },
  { code: 'CNY', symbol: '¥', label: 'CNY ¥', rate: 4.72 },
  { code: 'AED', symbol: 'د.إ', label: 'AED د.إ', rate: 2.39 },
  { code: 'MYR', symbol: 'RM', label: 'MYR RM', rate: 2.89 },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD NZ$', rate: 1.08 },
  { code: 'CAD', symbol: 'C$', label: 'CAD C$', rate: 0.89 },
  { code: 'INR', symbol: '₹', label: 'INR ₹', rate: 54.5 },
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
    // Defer the live-rates fetch until the browser is idle so it never blocks
    // first paint. Falls back to setTimeout if requestIdleCallback isn't supported.
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

    const w = window as any;
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(fetchRates, { timeout: 4000 })
      : window.setTimeout(fetchRates, 1500);

    return () => {
      if (w.cancelIdleCallback && typeof handle === 'number') w.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
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
