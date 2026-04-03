/**
 * Calculate buyer intent score (0–100) from lead data.
 */
export interface LeadScoreInput {
  status?: string | null;
  created_at?: string | null;
  message?: string | null;
  score?: number | null;       // DB score field
  user_phone?: string | null;
}

export function calcIntentScore(lead: LeadScoreInput): number {
  let s = 0;
  if (lead.status === 'qualified') s += 30;
  if (lead.status === 'new' && lead.created_at) {
    const age = Date.now() - new Date(lead.created_at).getTime();
    if (age < 24 * 60 * 60 * 1000) s += 20;
  }
  if (lead.message && lead.message.trim().length > 0) s += 15;
  if (typeof lead.score === 'number' && lead.score > 70) s += 20;
  if (lead.user_phone && lead.user_phone.trim().length > 0) s += 15;
  return Math.min(s, 100);
}

export type IntentTier = 'hot' | 'warm' | 'cold';

export function getIntentTier(score: number): { tier: IntentTier; label: string; className: string } {
  if (score >= 80) return { tier: 'hot', label: '🔥 Hot', className: 'bg-destructive/15 text-destructive' };
  if (score >= 50) return { tier: 'warm', label: '⚡ Warm', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  return { tier: 'cold', label: '❄️ Cold', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
}

export const INTENT_TOOLTIP = 'Intent score based on enquiry recency, message quality, and contact completeness.';
