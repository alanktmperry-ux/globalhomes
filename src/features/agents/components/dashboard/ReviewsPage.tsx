import { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, Copy, CheckCircle2, Inbox, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import DashboardHeader from './DashboardHeader';

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  review_text: string;
  relationship: string;
  reply_text: string | null;
  replied_at: string | null;
  status: string;
  created_at: string;
}

const ReviewsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent) { setLoading(false); return; }
      setAgentId(agent.id);

      const { data } = await supabase
        .from('agent_reviews')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false });
      if (data) setReviews(data as Review[]);
      setLoading(false);
    };
    fetchReviews();
  }, [user]);

  const approvedReviews = useMemo(() => reviews.filter(r => r.status === 'approved'), [reviews]);
  const pendingReviews = useMemo(() => reviews.filter(r => r.status === 'pending'), [reviews]);

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    approvedReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    const total = approvedReviews.length || 1;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star - 1],
      pct: (counts[star - 1] / total) * 100,
    }));
  }, [approvedReviews]);

  const avgRating = useMemo(() => {
    if (approvedReviews.length === 0) return 0;
    return approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length;
  }, [approvedReviews]);

  const handleGenerateLink = async () => {
    if (!agentId) return;
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase
        .from('review_requests')
        .insert({
          agent_id: agentId,
          client_name: clientName.trim() || null,
          client_email: clientEmail.trim() || null,
        })
        .select('token')
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/review/${data.token}`;
      setGeneratedLink(link);
    } catch {
      toast.error('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copied to clipboard');
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('agent_reviews')
      .update({ status: 'approved' })
      .eq('id', id);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      toast.success('Review approved and published');
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    const { error } = await supabase
      .from('agent_reviews')
      .update({ reply_text: replyText.trim(), replied_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, reply_text: replyText.trim(), replied_at: new Date().toISOString() } : r));
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply saved');
    }
    setSubmittingReply(false);
  };

  const handleCloseRequestDialog = () => {
    setShowRequestDialog(false);
    setClientName('');
    setClientEmail('');
    setGeneratedLink('');
  };

  return (
    <div>
      <DashboardHeader title="Reviews" subtitle="Manage client reviews and feedback" />
      <div className="p-4 sm:p-6 max-w-3xl space-y-6">

        {/* Request review CTA */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Build your reputation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ask satisfied clients to leave a review — it appears here and on your public profile.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShowRequestDialog(true)}>
            <MessageSquare size={14} className="mr-2" /> Request Review
          </Button>
        </div>

        {/* Rating breakdown */}
        {approvedReviews.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={14} className={i <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-border'} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{approvedReviews.length} review{approvedReviews.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingBreakdown.map(b => (
                  <div key={b.star} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-3">{b.star}</span>
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-4 text-right">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending reviews */}
        {pendingReviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending approval ({pendingReviews.length})</p>
            {pendingReviews.map(r => (
              <div key={r.id} className="bg-card border border-dashed border-warning/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                      {r.reviewer_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.reviewer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.relationship} · {new Date(r.created_at).toLocaleDateString('en-AU')}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={12} className={i <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.review_text}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" className="text-xs" onClick={() => handleApprove(r.id)}>
                    <CheckCircle2 size={12} className="mr-1" /> Approve & Publish
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approved reviews */}
        {approvedReviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Published ({approvedReviews.length})</p>
            {approvedReviews.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                      {r.reviewer_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.reviewer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.relationship} · {new Date(r.created_at).toLocaleDateString('en-AU')}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={12} className={i <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.review_text}</p>

                {r.reply_text ? (
                  <div className="ml-4 pl-4 border-l-2 border-primary/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Your reply</p>
                    <p className="text-sm text-foreground">{r.reply_text}</p>
                  </div>
                ) : replyingTo === r.id ? (
                  <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      className="min-h-[80px] resize-none text-sm"
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="text-xs" disabled={submittingReply} onClick={() => handleReply(r.id)}>
                        {submittingReply ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send size={12} className="mr-1" />}
                        Send reply
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setReplyingTo(r.id)}>
                    <MessageSquare size={12} className="mr-1" /> Reply
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Inbox size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No reviews yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Request your first review from a client to start building your reputation.
            </p>
            <div className="flex gap-0.5 mt-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={18} className="text-border" />
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Request Review Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={open => { if (!open) handleCloseRequestDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a review</DialogTitle>
          </DialogHeader>
          {!generatedLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a unique link to send to your client. They can leave a review without creating an account.
              </p>
              <div className="space-y-2">
                <Label className="text-sm">Client name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Sarah M." />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Client email <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </div>
              <Button onClick={handleGenerateLink} disabled={generatingLink} className="w-full">
                {generatingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
                Generate review link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                <code className="text-xs flex-1 break-all text-foreground">{generatedLink}</code>
                <Button size="sm" variant="ghost" onClick={handleCopyLink}>
                  <Copy size={14} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy this link and send it to your client via email, SMS, or any messaging app. The link expires in 30 days.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseRequestDialog}>Done</Button>
                <Button className="flex-1" onClick={() => { setGeneratedLink(''); setClientName(''); setClientEmail(''); }}>
                  Generate another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsPage;
