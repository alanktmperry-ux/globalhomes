import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

type Step = 'loading' | 'form' | 'submitted' | 'invalid';

interface AgentInfo {
  name: string;
  agency: string | null;
  avatar_url: string | null;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'buyer', label: 'I was a buyer' },
  { value: 'seller', label: 'I was a seller' },
  { value: 'tenant', label: 'I was a tenant' },
  { value: 'landlord', label: 'I was a landlord' },
  { value: 'referral', label: 'I was referred' },
];

export default function ReviewSubmitPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('buyer');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setStep('invalid');
        return;
      }
      const { data: req } = await supabase
        .from('review_requests')
        .select('id, agent_id, used, expires_at, client_name, client_email')
        .eq('token', token)
        .maybeSingle();

      if (!req) {
        setStep('invalid');
        return;
      }
      if (req.used) {
        setStep('invalid');
        return;
      }
      if (new Date(req.expires_at) < new Date()) {
        setStep('invalid');
        return;
      }
      if (req.client_name) setName(req.client_name);
      if (req.client_email) setEmail(req.client_email);

      setRequestId(req.id);
      setAgentId(req.agent_id);

      const { data: agentData } = await supabase
        .from('agents')
        .select('name, agency, avatar_url, profile_photo_url')
        .eq('id', req.agent_id)
        .maybeSingle();

      if (agentData) {
        setAgent({
          name: agentData.name,
          agency: agentData.agency,
          avatar_url: agentData.avatar_url || agentData.profile_photo_url,
        });
      }
      setStep('form');
    };
    validate();
  }, [token]);

  const handleSubmit = async () => {
    if (!agentId || !requestId) return;
    if (rating === 0) {
      setError('Please choose a star rating.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (reviewText.trim().length < 10) {
      setError('Review must be at least 10 characters.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: reviewErr } = await supabase
        .from('agent_reviews')
        .insert({
          agent_id: agentId,
          reviewer_name: name.trim(),
          reviewer_email: email.trim() || null,
          rating,
          review_text: reviewText.trim(),
          relationship,
          status: 'pending',
          submitted_by: user?.id ?? null,
        } as any);
      if (reviewErr) throw reviewErr;
      await supabase
        .from('review_requests')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', requestId);
      setStep('submitted');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-destructive" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-2">Link not valid</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          This review link has already been used or has expired. Ask your agent to send you a new one.
        </p>
        <Button onClick={() => navigate('/')}>Go to ListHQ</Button>
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle2 size={24} className="text-success" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-2">Thank you!</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          Your review has been submitted.{' '}
          {agent?.name ? `${agent.name} will ` : 'The agent will '}
          review it and publish it to their profile.
        </p>
        <div className="flex gap-0.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={20} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-border'} />
          ))}
        </div>
        <Button onClick={() => navigate('/')}>Go to ListHQ</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {agent && (
          <div className="flex items-center gap-4">
            {agent.avatar_url ? (
              <img src={agent.avatar_url} alt={agent.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {agent.name[0]}
              </div>
            )}
            <div>
              <p className="font-display text-lg font-bold text-foreground">{agent.name}</p>
              {agent.agency && (
                <p className="text-sm text-muted-foreground">{agent.agency}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Leave a review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your honest feedback helps other buyers and sellers choose the right agent.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Your rating *</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star size={28} className={i <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border'} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-muted-foreground">
              {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">How did you work with this agent? *</Label>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRelationship(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  relationship === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Your review *</Label>
          <Textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Describe your experience working with this agent..."
            className="min-h-[120px] resize-none"
            maxLength={1000}
          />
          <p className="text-[10px] text-muted-foreground text-right">{reviewText.length}/1000</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Your name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Michael T." />
          <p className="text-[10px] text-muted-foreground">
            First name and last initial is fine. This will be shown publicly.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Email address <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          <p className="text-[10px] text-muted-foreground">Not shown publicly.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting…
            </>
          ) : (
            'Submit review'
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          By submitting you confirm this review is based on your genuine experience. Reviews are moderated before publishing.
        </p>
      </div>
    </div>
  );
}
