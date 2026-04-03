import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface PreApproval {
  id: string;
  document_type: string;
  lender_name: string | null;
  approved_amount: number | null;
  expiry_date: string | null;
  issue_date: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  rejection_reason: string | null;
  submitted_at: string;
  document_url: string;
}

export function usePreApproval() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PreApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('buyer_pre_approvals')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });
    setApprovals((data as unknown as PreApproval[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const submitApproval = async (
    file: File,
    meta: {
      document_type: string;
      lender_name: string;
      approved_amount: number | null;
      expiry_date: string;
      issue_date: string;
    }
  ) => {
    if (!user) return;
    setUploading(true);
    setUploadError(null);

    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('pre-approval-docs')
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { error: insertErr } = await supabase
      .from('buyer_pre_approvals')
      .insert({
        user_id: user.id,
        document_url: path,
        document_type: meta.document_type,
        lender_name: meta.lender_name || null,
        approved_amount: meta.approved_amount ?? null,
        expiry_date: meta.expiry_date || null,
        issue_date: meta.issue_date || null,
      } as any);

    if (insertErr) {
      setUploadError('Could not save your submission. Please try again.');
    } else {
      await fetchApprovals();
    }

    setUploading(false);
  };

  const activeApproval = approvals.find(a => a.status === 'verified');
  const pendingApproval = approvals.find(a => a.status === 'pending');

  return {
    approvals,
    loading,
    uploading,
    uploadError,
    submitApproval,
    activeApproval,
    pendingApproval,
    refetch: fetchApprovals,
  };
}
