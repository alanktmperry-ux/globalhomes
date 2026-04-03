import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { useSubmitReview } from '../hooks/useSubmitReview';
import type { ReviewType, ReviewFormData } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agentId: string;
  agentName: string;
  open: boolean;
  onClose: () => void;
}

const REVIEW_TYPES: { value: ReviewType; label: string; icon: string }[] = [
  { value: 'buyer', label: 'Buyer', icon: '🏠' },
  { value: 'vendor', label: 'Vendor', icon: '💰' },
  { value: 'tenant', label: 'Tenant', icon: '🔑' },
  { value: 'landlord', label: 'Landlord', icon: '🏢' },
];

export function WriteReviewModal({ agentId, agentName, open, onClose }: Props) {
  const { submitReview, submitting, submitted, error } = useSubmitReview(agentId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ReviewFormData>({
    review_type: 'buyer', rating: 0, title: '', body: '',
    suburb: '', year_of_service: new Date().getFullYear(),
    reviewer_name: '', reviewer_email: '',
  });

  // Pre-fill from auth
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setForm(prev => ({
          ...prev,
          reviewer_email: user.email || prev.reviewer_email,
          reviewer_name: user.user_metadata?.full_name || prev.reviewer_name,
        }));
      }
    });
  }, [open]);

  if (!open) return null;

  const set = (key: keyof ReviewFormData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-border">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <h2 className="text-xl font-bold text-foreground">Review Submitted!</h2>
          <p className="text-sm text-muted-foreground">
            Check your email to verify your review. Once verified, it will be published on {agentName}'s profile.
          </p>
          <button onClick={onClose} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl max-w-lg w-full border border-border mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg text-foreground">Write a Review for {agentName}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 0: Basics */}
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">How do you know {agentName}?</label>
                <div className="grid grid-cols-2 gap-2">
                  {REVIEW_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => set('review_type', t.value)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors
                        ${form.review_type === t.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-foreground/30'
                        }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Your rating *</label>
                <StarRating rating={form.rating} size="lg" interactive onChange={r => set('rating', r)} />
                {form.rating === 0 && <p className="text-xs text-destructive mt-1">Please select a rating</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Summarise your experience"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your review *</label>
                <textarea
                  value={form.body}
                  onChange={e => set('body', e.target.value)}
                  placeholder={`Tell others about your experience with ${agentName}...`}
                  rows={4}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.body.length}/50 min characters</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Suburb (optional)</label>
                  <input
                    value={form.suburb || ''}
                    onChange={e => set('suburb', e.target.value)}
                    placeholder="e.g. Surry Hills"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Year of service</label>
                  <input
                    type="number"
                    value={form.year_of_service || ''}
                    onChange={e => set('year_of_service', Number(e.target.value))}
                    min={2010} max={new Date().getFullYear()}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 1: About you */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your name *</label>
                <input
                  value={form.reviewer_name}
                  onChange={e => set('reviewer_name', e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your email *</label>
                <input
                  type="email"
                  value={form.reviewer_email}
                  onChange={e => set('reviewer_email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">For verification only — not published</p>
              </div>

              {/* Summary */}
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Review Summary</p>
                <div className="flex items-center gap-2">
                  <StarRating rating={form.rating} size="sm" />
                  <span className="text-sm font-medium text-foreground">{form.title || 'No title'}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{form.body}</p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                ← Back
              </button>
            )}
            {step === 0 ? (
              <button
                onClick={() => setStep(1)}
                disabled={form.rating === 0 || form.body.length < 50}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => submitReview(form)}
                disabled={submitting || !form.reviewer_name || !form.reviewer_email}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit Review →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
