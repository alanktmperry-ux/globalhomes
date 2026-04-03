import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, X, Eye } from 'lucide-react';

interface PendingApproval {
  id: string;
  user_id: string;
  document_url: string;
  document_type: string;
  lender_name: string | null;
  approved_amount: number | null;
  expiry_date: string | null;
  issue_date: string | null;
  submitted_at: string;
}

const PreApprovalReview = () => {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('buyer_pre_approvals')
      .select('id, user_id, document_url, document_type, lender_name, approved_amount, expiry_date, issue_date, submitted_at')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .then(({ data }) => {
        setPending((data as unknown as PendingApproval[]) ?? []);
        setLoading(false);
      });
  }, []);

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('pre-approval-docs')
      .createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  };

  const handleVerify = async (id: string) => {
    setActionId(id);
    await supabase
      .from('buyer_pre_approvals')
      .update({ status: 'verified', verified_at: new Date().toISOString() } as any)
      .eq('id', id);
    // Notify buyer
    await supabase.functions.invoke('notify-pre-approval-result', {
      body: { approval_id: id },
    });
    setPending(prev => prev.filter(p => p.id !== id));
    setActionId(null);
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    await supabase
      .from('buyer_pre_approvals')
      .update({
        status: 'rejected',
        rejection_reason: rejectionNote || 'Document could not be verified. Please resubmit with a clear, legible pre-approval letter.',
      } as any)
      .eq('id', id);
    await supabase.functions.invoke('notify-pre-approval-result', {
      body: { approval_id: id },
    });
    setPending(prev => prev.filter(p => p.id !== id));
    setActionId(null);
    setShowRejectFor(null);
    setRejectionNote('');
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading pending reviews…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Pre-Approval Review</h2>
        {pending.length > 0 && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">All caught up — no pending reviews</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map(item => (
          <div key={item.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">User: {item.user_id.slice(0, 8)}…</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {item.document_type.replace(/_/g, ' ')}
                  </span>
                  {item.lender_name && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {item.lender_name}
                    </span>
                  )}
                  {item.approved_amount && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      ${Number(item.approved_amount).toLocaleString()}
                    </span>
                  )}
                  {item.expiry_date && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      Expires {new Date(item.expiry_date).toLocaleDateString('en-AU')}
                    </span>
                  )}
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Submitted {new Date(item.submitted_at).toLocaleDateString('en-AU')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    const url = await getSignedUrl(item.document_url);
                    if (url) window.open(url, '_blank');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted transition-colors"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
                <button
                  onClick={() => handleVerify(item.id)}
                  disabled={actionId === item.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <ShieldCheck className="w-3 h-3" />
                  {actionId === item.id ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  onClick={() => setShowRejectFor(item.id)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-destructive/30 text-destructive rounded-lg text-xs hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3 h-3" /> Reject
                </button>
              </div>
            </div>

            {showRejectFor === item.id && (
              <div className="space-y-2 pt-2 border-t border-border">
                <textarea
                  value={rejectionNote}
                  onChange={e => setRejectionNote(e.target.value)}
                  placeholder="Reason for rejection (shown to buyer)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-destructive/30 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none bg-card text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={actionId === item.id}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {actionId === item.id ? 'Rejecting…' : 'Confirm rejection'}
                  </button>
                  <button
                    onClick={() => { setShowRejectFor(null); setRejectionNote(''); }}
                    className="px-4 py-2 text-muted-foreground text-sm hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreApprovalReview;
