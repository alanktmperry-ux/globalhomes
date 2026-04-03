import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentRequest } from '../types';

export function useDocumentRequests(propertyId: string | undefined) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    supabase
      .from('document_requests' as any)
      .select('*, document_categories(slug, label, icon)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRequests((data ?? []) as unknown as DocumentRequest[]);
        setLoading(false);
      });
  }, [propertyId]);

  async function createRequest(
    propId: string,
    params: Partial<DocumentRequest>
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from('document_requests' as any) as any).insert({
      property_id: propId,
      requested_by: user.id,
      ...params,
    });
  }

  async function fulfillRequest(requestId: string, docId: string) {
    await (supabase.from('document_requests' as any) as any)
      .update({ status: 'uploaded', fulfilled_by_doc_id: docId, fulfilled_at: new Date().toISOString() })
      .eq('id', requestId);
  }

  async function cancelRequest(requestId: string) {
    await (supabase.from('document_requests' as any) as any)
      .update({ status: 'cancelled' })
      .eq('id', requestId);
  }

  return { requests, loading, createRequest, fulfillRequest, cancelRequest };
}
