import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

export interface PipelineStage {
  id: string;
  agency_id: string;
  label: string;
  color: string;          // hex
  probability: number;    // 0-100
  display_order: number;
  is_active: boolean;
}

/** Built-in defaults for solo agents (no agency_id). UI-only — no DB rows. */
export const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'default-prospecting', agency_id: '', label: 'Prospecting', color: '#3b82f6', probability: 10,  display_order: 0, is_active: true },
  { id: 'default-appraisal',   agency_id: '', label: 'Appraisal',   color: '#a855f7', probability: 25,  display_order: 1, is_active: true },
  { id: 'default-listed',      agency_id: '', label: 'Listed',      color: '#f59e0b', probability: 50,  display_order: 2, is_active: true },
  { id: 'default-under-offer', agency_id: '', label: 'Under Offer', color: '#10b981', probability: 80,  display_order: 3, is_active: true },
  { id: 'default-settled',     agency_id: '', label: 'Settled',     color: '#64748b', probability: 100, display_order: 4, is_active: true },
];

/** Predefined templates that admins can load over their pipeline. */
export const STAGE_TEMPLATES: Record<string, Omit<PipelineStage, 'id' | 'agency_id'>[]> = {
  'Residential Sales': [
    { label: 'Prospecting', color: '#3b82f6', probability: 10, display_order: 0, is_active: true },
    { label: 'Appraisal',   color: '#a855f7', probability: 25, display_order: 1, is_active: true },
    { label: 'Listed',      color: '#f59e0b', probability: 50, display_order: 2, is_active: true },
    { label: 'Under Offer', color: '#10b981', probability: 80, display_order: 3, is_active: true },
    { label: 'Settled',     color: '#64748b', probability: 100, display_order: 4, is_active: true },
  ],
  'Commercial': [
    { label: 'Lead',         color: '#3b82f6', probability: 5,   display_order: 0, is_active: true },
    { label: 'Inspection',   color: '#8b5cf6', probability: 20,  display_order: 1, is_active: true },
    { label: 'Due Diligence',color: '#a855f7', probability: 40,  display_order: 2, is_active: true },
    { label: 'Negotiation',  color: '#f59e0b', probability: 65,  display_order: 3, is_active: true },
    { label: 'Contract',     color: '#10b981', probability: 85,  display_order: 4, is_active: true },
    { label: 'Settled',      color: '#64748b', probability: 100, display_order: 5, is_active: true },
  ],
  'Rural': [
    { label: 'Initial Contact', color: '#3b82f6', probability: 10, display_order: 0, is_active: true },
    { label: 'Site Visit',      color: '#8b5cf6', probability: 25, display_order: 1, is_active: true },
    { label: 'Appraisal',       color: '#a855f7', probability: 40, display_order: 2, is_active: true },
    { label: 'Marketing',       color: '#f59e0b', probability: 60, display_order: 3, is_active: true },
    { label: 'Negotiation',     color: '#fb923c', probability: 80, display_order: 4, is_active: true },
    { label: 'Settled',         color: '#64748b', probability: 100, display_order: 5, is_active: true },
  ],
  'Off-Market': [
    { label: 'Vendor Brief',   color: '#3b82f6', probability: 15,  display_order: 0, is_active: true },
    { label: 'Buyer Matched',  color: '#8b5cf6', probability: 40,  display_order: 1, is_active: true },
    { label: 'Inspection',     color: '#f59e0b', probability: 60,  display_order: 2, is_active: true },
    { label: 'Offer',          color: '#10b981', probability: 80,  display_order: 3, is_active: true },
    { label: 'Settled',        color: '#64748b', probability: 100, display_order: 4, is_active: true },
  ],
  'Project Marketing': [
    { label: 'EOI',           color: '#3b82f6', probability: 10,  display_order: 0, is_active: true },
    { label: 'Reservation',   color: '#8b5cf6', probability: 30,  display_order: 1, is_active: true },
    { label: 'Contract Out',  color: '#a855f7', probability: 50,  display_order: 2, is_active: true },
    { label: 'Exchanged',     color: '#10b981', probability: 80,  display_order: 3, is_active: true },
    { label: 'Settled',       color: '#64748b', probability: 100, display_order: 4, is_active: true },
  ],
};

/**
 * Loads pipeline stages for the current agent's agency.
 * Solo agents (no agency_id) receive built-in defaults from DEFAULT_STAGES.
 */
export function usePipelineStages() {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: agent } = await supabase
      .from('agents')
      .select('agency_id, agency_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!agent?.agency_id) {
      setStages(DEFAULT_STAGES);
      setAgencyId(null);
      setCanEdit(false);
      setLoading(false);
      return;
    }

    setAgencyId(agent.agency_id);
    setCanEdit(['principal', 'admin'].includes(agent.agency_role || ''));

    const { data } = await supabase
      .from('pipeline_stages' as any)
      .select('*')
      .eq('agency_id', agent.agency_id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    setStages(((data as any[]) || []) as PipelineStage[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { stages, agencyId, canEdit, loading, refresh: load };
}

/** Heuristic: detect special semantic stages by label so business logic
 *  (settlement modal, status sync) keeps working with renamed stages. */
export function isSettledStage(s: { label: string; probability: number }): boolean {
  return s.probability >= 100 || /settled|sold|closed|won/i.test(s.label);
}
export function isUnderOfferStage(s: { label: string }): boolean {
  return /under offer|offer|contract|negotiation|exchanged/i.test(s.label);
}
export function isListedStage(s: { label: string }): boolean {
  return /listed|on market|marketing|public/i.test(s.label);
}

/** Map a stage to the property.status / is_active that should accompany it
 *  to keep public-facing visibility in sync. */
export function stageToPropertyStatus(stage: { label: string; probability: number }): { status: string; is_active: boolean } {
  if (isSettledStage(stage))     return { status: 'sold',         is_active: false };
  if (isUnderOfferStage(stage))  return { status: 'under_offer',  is_active: true  };
  if (isListedStage(stage))      return { status: 'public',       is_active: true  };
  // Pre-listing stages
  if (/appraisal|valuation/i.test(stage.label)) return { status: 'coming-soon', is_active: false };
  return { status: 'pending', is_active: false };
}
