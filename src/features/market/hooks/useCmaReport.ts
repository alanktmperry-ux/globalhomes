import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CmaReport, ComparableSaleRecord } from '@/types/market';

export function useCmaReports() {
  const [reports, setReports] = useState<CmaReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from('cma_reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports((data as any as CmaReport[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const createReport = async (values: Partial<CmaReport>) => {
    const { data, error } = await supabase
      .from('cma_reports')
      .insert(values as any)
      .select()
      .single();
    if (!error) await fetchReports();
    return { data: data as any as CmaReport | null, error };
  };

  const updateReport = async (id: string, values: Partial<CmaReport>) => {
    const { data, error } = await supabase
      .from('cma_reports')
      .update(values as any)
      .eq('id', id)
      .select()
      .single();
    if (!error) setReports(prev => prev.map(r => r.id === id ? (data as any as CmaReport) : r));
    return { data: data as any as CmaReport | null, error };
  };

  const shareReport = async (id: string, vendorEmail?: string) => {
    const { data, error } = await supabase
      .from('cma_reports')
      .update({ is_shared: true, shared_at: new Date().toISOString(), prepared_for_email: vendorEmail } as any)
      .eq('id', id)
      .select('share_token')
      .single();
    if (!error) await fetchReports();
    return { shareToken: (data as any)?.share_token, error };
  };

  const deleteReport = async (id: string) => {
    const { error } = await supabase.from('cma_reports').delete().eq('id', id);
    if (!error) setReports(prev => prev.filter(r => r.id !== id));
    return { error };
  };

  return { reports, loading, createReport, updateReport, shareReport, deleteReport, refetch: fetchReports };
}

export function useCmaReportById(id: string | undefined) {
  const [report, setReport] = useState<CmaReport | null>(null);
  const [comparables, setComparables] = useState<ComparableSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('cma_reports')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const report = data as any as CmaReport;
          setReport(report);
          if (report.selected_comparable_ids?.length) {
            supabase
              .from('comparable_sales')
              .select('*')
              .in('id', report.selected_comparable_ids)
              .then(({ data: comps }) => setComparables((comps as any as ComparableSaleRecord[]) ?? []));
          }
        }
        setLoading(false);
      });
  }, [id]);

  return { report, comparables, loading };
}

export function useSharedCma(shareToken: string | undefined) {
  const [report, setReport] = useState<CmaReport | null>(null);
  const [comparables, setComparables] = useState<ComparableSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareToken) return;
    supabase
      .rpc('track_cma_view', { p_share_token: shareToken })
      .then(({ data }) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed) {
          const r = parsed as CmaReport;
          setReport(r);
          if (r.selected_comparable_ids?.length) {
            supabase
              .from('comparable_sales')
              .select('*')
              .in('id', r.selected_comparable_ids)
              .then(({ data: comps }) => setComparables((comps as any as ComparableSaleRecord[]) ?? []));
          }
        }
        setLoading(false);
      });
  }, [shareToken]);

  return { report, comparables, loading };
}
