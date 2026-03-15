import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type CurrencyCode = 'AUD' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type ListingMode = 'sale' | 'rent';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number; // relative to AUD
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'AUD', symbol: '$', label: 'AUD $', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD $', rate: 0.65 },
  { code: 'EUR', symbol: '€', label: 'EUR €', rate: 0.60 },
  { code: 'GBP', symbol: '£', label: 'GBP £', rate: 0.52 },
  { code: 'JPY', symbol: '¥', label: 'JPY ¥', rate: 97.5 },
];

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrencyCode: (code: CurrencyCode) => void;
  convertPrice: (audPrice: number) => number;
  formatPrice: (audPrice: number, isRental?: boolean) => string;
  listingMode: ListingMode;
  setListingMode: (mode: ListingMode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('AUD');
  const [listingMode, setListingMode] = useState<ListingMode>('sale');

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

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
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convertPrice, formatPrice, listingMode, setListingMode }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
