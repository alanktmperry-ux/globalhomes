import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  offerId: string;
  cardId: string;
  userId: string;
  onOutcome: (cardId: string, outcome: 'accepted' | 'rejected' | 'countered') => void;
}

const OfferOutcomeTracker = ({ offerId, cardId, userId, onOutcome }: Props) => {
  const [submitting, setSubmitting] = useState(false);

  const handleOutcome = async (outcome: 'accepted' | 'rejected' | 'countered') => {
    setSubmitting(true);
    try {
      await supabase.from('offers').update({ status: outcome, resolved_at: new Date().toISOString() }).eq('id', offerId);
      await supabase.from('activities').insert({
        user_id: userId,
        action: 'offer_outcome',
        entity_type: 'offer',
        entity_id: offerId,
        description: `Offer ${outcome}`,
      });
      toast({ title: `Offer ${outcome}` });
      onOutcome(cardId, outcome);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
      {[
        { key: 'accepted' as const, label: '✅', title: 'Accepted' },
        { key: 'rejected' as const, label: '❌', title: 'Rejected' },
        { key: 'countered' as const, label: '🔄', title: 'Countered' },
      ].map(o => (
        <button
          key={o.key}
          disabled={submitting}
          onClick={() => handleOutcome(o.key)}
          title={o.title}
          className="text-[10px] px-1.5 py-0.5 rounded-full border border-border hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default OfferOutcomeTracker;
