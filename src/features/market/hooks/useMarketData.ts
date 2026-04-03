import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ComparableSaleRecord, SuburbSummary, SuburbPriceTrendPoint } from '@/types/market';

const PAGE_SIZE = 12;

export function useMarketComparableSales(
  suburb: string,
  state: string,
  filters?: { propertyType?: string; bedrooms?: number; monthsBack?: number },
  page: number = 0
) {
  const [sales, setSales] = useState<ComparableSaleRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [medianPrice, setMedianPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) return;
    setLoading(true);
    supabase
      .rpc('get_comparable_sales', {
        p_suburb: suburb,
        p_state: state,
        p_property_type: filters?.propertyType ?? null,
        p_bedrooms: filters?.bedrooms ?? null,
        p_months_back: filters?.monthsBack ?? 12,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      })
      .then(({ data }) => {
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          setSales(parsed.sales ?? []);
          setTotalCount(parsed.total_count ?? 0);
          setMedianPrice(parsed.median_price ?? null);
        }
        setLoading(false);
      });
  }, [suburb, state, filters?.propertyType, filters?.bedrooms, filters?.monthsBack, page]);

  return { sales, totalCount, medianPrice, loading, PAGE_SIZE };
}

export function useSuburbSummary(suburb: string, state: string, propertyType = 'house') {
  const [summary, setSummary] = useState<SuburbSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) return;
    supabase
      .rpc('get_suburb_summary', { p_suburb: suburb, p_state: state, p_property_type: propertyType })
      .then(({ data }) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setSummary(parsed);
        setLoading(false);
      });
  }, [suburb, state, propertyType]);

  return { summary, loading };
}

export function useSuburbPriceTrend(suburb: string, state: string, propertyType = 'house', months = 24) {
  const [trend, setTrend] = useState<SuburbPriceTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!suburb || !state) return;
    supabase
      .rpc('get_suburb_price_trend', {
        p_suburb: suburb,
        p_state: state,
        p_property_type: propertyType,
        p_months: months,
      })
      .then(({ data }) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setTrend(parsed ?? []);
        setLoading(false);
      });
  }, [suburb, state, propertyType, months]);

  return { trend, loading };
}

export function usePropertyComparables(propertyId: string | undefined, monthsBack = 12) {
  const [comparables, setComparables] = useState<ComparableSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    supabase
      .rpc('get_property_comparables', {
        p_property_id: propertyId,
        p_months_back: monthsBack,
        p_limit: 6,
      })
      .then(({ data }) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setComparables(parsed ?? []);
        setLoading(false);
      });
  }, [propertyId, monthsBack]);

  return { comparables, loading };
}
