import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReviewFormData } from '../types';

export function useSubmitReview(agentId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview(form: ReviewFormData) {
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: err } = await supabase
      .from('agent_reviews')
      .insert({
        agent_id: agentId,
        reviewer_name: form.reviewer_name,
        reviewer_email: form.reviewer_email,
        review_type: form.review_type,
        rating: form.rating,
        title: form.title,
        review_text: form.body,
        suburb: form.suburb,
        year_of_service: form.year_of_service,
        relationship: form.review_type,
        status: 'pending',
        verified: false,
      } as any);

    if (err) {
      setError('Could not submit review. Please try again.');
    } else {
      // Trigger verification email
      await supabase.functions.invoke('send-review-verification', {
        body: { agent_id: agentId, reviewer_email: form.reviewer_email },
      });
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  return { submitReview, submitting, submitted, error };
}
