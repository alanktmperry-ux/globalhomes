import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyDocument, UploadDocumentInput } from '../types';
import { getErrorMessage } from '@/shared/lib/errorUtils';

export function usePropertyDocuments(propertyId: string | undefined) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('property_documents' as any)
      .select('*, document_categories ( slug, label, icon, description )')
      .eq('property_id', propertyId)
      .eq('is_current', true)
      .order('created_at', { ascending: false });
    if (!err) setDocuments((data ?? []) as unknown as PropertyDocument[]);
    else setError(getErrorMessage(err));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function uploadDocument(input: UploadDocumentInput): Promise<PropertyDocument | null> {
    setUploading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be signed in to upload documents');

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const uploaderRole = agent ? 'agent' : 'buyer';

      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${input.propertyId}/${input.categorySlug}/${Date.now()}_${safeName}`;

      const { error: storageErr } = await supabase.storage
        .from('property-documents')
        .upload(filePath, input.file, { contentType: input.file.type, upsert: false });
      if (storageErr) throw storageErr;

      const { data: docRecord, error: dbErr } = await (supabase
        .from('property_documents' as any)
        .insert({
          property_id: input.propertyId,
          category_slug: input.categorySlug,
          uploaded_by: user.id,
          uploader_role: uploaderRole,
          file_name: safeName,
          file_path: filePath,
          file_size_bytes: input.file.size,
          mime_type: input.file.type,
          label: input.label,
          description: input.description,
          access_level: input.accessLevel,
          visible_to_roles: input.visibleToRoles,
          expires_at: input.expiresAt ?? null,
        }) as any)
        .select()
        .single();

      if (dbErr) throw dbErr;
      await fetchDocs();
      return docRecord as PropertyDocument;
    } catch (e: unknown) {
      setError(getErrorMessage(e) ?? 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function getDownloadUrl(doc: PropertyDocument): Promise<string | null> {
    await supabase.rpc('log_document_download' as any, { p_document_id: doc.id });
    const { data, error: err } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (err || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  async function deleteDocument(docId: string) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    await supabase.storage.from('property-documents').remove([doc.file_path]);
    await (supabase.from('property_documents' as any) as any).delete().eq('id', docId);
    await fetchDocs();
  }

  async function updateAccess(docId: string, accessLevel: string, visibleToRoles: string[]) {
    await (supabase.from('property_documents' as any) as any)
      .update({ access_level: accessLevel, visible_to_roles: visibleToRoles })
      .eq('id', docId);
    await fetchDocs();
  }

  return {
    documents, loading, uploading, error,
    uploadDocument, getDownloadUrl, deleteDocument, updateAccess, refetch: fetchDocs,
  };
}
